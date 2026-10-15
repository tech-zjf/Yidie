#!/usr/bin/env python3
"""Validate the planning packet; not an iOS test suite."""
from pathlib import Path
import re
import sqlite3
import subprocess
import tempfile
import json
import shlex

root = Path(__file__).resolve().parents[1]
tracked = subprocess.check_output(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], cwd=root).decode().split('\0')
tracked = {name for name in tracked if name}
obsolete_design_prototypes = sorted(
    name for name in tracked
    if Path(name).parent == Path('design') and Path(name).suffix.lower() in {'.html', '.htm'}
)
assert not obsolete_design_prototypes, (
    'Do not publish the retired HTML-only design prototypes: '
    + ', '.join(obsolete_design_prototypes)
)
print('PASS publication hygiene: no retired HTML design prototypes')

mobile_root = root / 'apps/mobile'
package = json.loads((mobile_root / 'package.json').read_text())
test_command = shlex.split(package['scripts']['test'])
assert '--test' in test_command, 'The mobile test command must invoke Node test runner'
patterns = test_command[test_command.index('--test') + 1:]
declared_tests = {
    path.relative_to(mobile_root).as_posix()
    for pattern in patterns
    for path in mobile_root.glob(pattern)
}
tracked_mobile_tests = {
    Path(name).relative_to('apps/mobile').as_posix()
    for name in tracked
    if name.startswith('apps/mobile/') and name.endswith(('.test.ts', '.test.js', '.test.mjs'))
}
assert declared_tests == tracked_mobile_tests, (
    'Every tracked mobile test must be covered by package.json scripts.test; '
    f'missing={sorted(tracked_mobile_tests - declared_tests)}, '
    f'not tracked as tests={sorted(declared_tests - tracked_mobile_tests)}'
)
native_test_entrypoints = {
    name for name in tracked
    if name.startswith('scripts/native-tests/') and name.endswith('.swift')
    and (Path(name).name == 'main.swift')
}
native_check = (root / 'scripts/check_native.sh').read_text()
assert native_test_entrypoints and all(name in native_check for name in native_test_entrypoints), (
    'Every native test entry point must be compiled by scripts/check_native.sh'
)
workflow = (root / '.github/workflows/ci.yml').read_text()
assert 'npm run check' in workflow and 'sh scripts/check_native.sh' in workflow, (
    'CI must run the mobile and native test entry points'
)
print('PASS test inventory: every tracked JS and Swift test entry point runs in CI')

for name in tracked:
    file = root / name
    if file.suffix != '.md' or not file.is_file():
        continue
    for target in re.findall(r'\]\(([^)]+)\)', file.read_text()):
        if '://' in target or target.startswith('#'):
            continue
        path = (file.parent / target.split('#')[0]).resolve()
        assert path.exists(), f'Missing link: {file.relative_to(root)} → {target}'
print('PASS local document links')

db = sqlite3.connect(':memory:')
db.executescript((root / 'specs/schema.sql').read_text())
for migration in sorted((root / 'specs/migrations').glob('*.sql')):
    db.executescript(migration.read_text())
db.executemany('INSERT INTO days(record_date) VALUES (?)', [('2026-06-12',),('2026-06-13',)])
sql = '''INSERT INTO entries(id,record_date,date_source,original_path,layout_seed,sort_key,imported_at,updated_at)
VALUES (?,?,?,?,?,?,?,?)'''
db.execute(sql, ('a','2026-06-12','user','originals/a.heic',1,1,'now','now'))
db.execute(sql, ('b','2026-06-13','user','originals/b.heic',2,2,'now','now'))
db.execute(sql, ('pending',None,'unknown','originals/p.heic',3,3,'now','now'))
db.execute("UPDATE days SET cover_entry_id='a' WHERE record_date='2026-06-12'")

def rejects(statement):
    try:
        db.execute(statement)
    except sqlite3.IntegrityError:
        return
    raise AssertionError('Expected rejection: ' + statement)

rejects("UPDATE days SET cover_entry_id='b' WHERE record_date='2026-06-12'")
rejects("UPDATE entries SET processing_state='ready' WHERE id='a'")
rejects("UPDATE entries SET record_date='2026-06-13' WHERE id='pending'")
db.execute("UPDATE entries SET record_date='2026-06-13' WHERE id='a'")
assert db.execute("SELECT cover_entry_id FROM days WHERE record_date='2026-06-12'").fetchone()[0] is None
db.execute("UPDATE days SET cover_entry_id='a' WHERE record_date='2026-06-13'")
db.execute("INSERT INTO processing_jobs(id,entry_id,state,expected_revision,attempt,error_code,created_at,updated_at) VALUES('j','a','queued',0,0,NULL,'now','now')")
db.execute("DELETE FROM entries WHERE id='a'")
assert db.execute('SELECT count(*) FROM processing_jobs').fetchone()[0] == 0
assert db.execute("SELECT cover_entry_id FROM days WHERE record_date='2026-06-13'").fetchone()[0] is None
assert db.execute('PRAGMA foreign_key_check').fetchall() == []
db.commit()
print('PASS SQL: cover ownership, pending date, ready invariant, move/delete and job cascade')

# Foreign-key pragmas are connection-local and cannot be enabled after BEGIN.
with tempfile.TemporaryDirectory() as folder:
    path = Path(folder) / 'foreign-keys.sqlite'
    first = sqlite3.connect(path)
    first.execute('PRAGMA foreign_keys=ON')
    first.executescript('CREATE TABLE parent(id INTEGER PRIMARY KEY); CREATE TABLE child(id INTEGER REFERENCES parent(id));')
    second = sqlite3.connect(path)
    second.execute('PRAGMA foreign_keys=ON')
    assert second.execute('PRAGMA foreign_keys').fetchone()[0] == 1
    second.execute('BEGIN IMMEDIATE')
    try:
        second.execute('INSERT INTO child VALUES(999)')
        raise AssertionError('SQLite transaction must enforce foreign keys')
    except sqlite3.IntegrityError:
        second.rollback()
    second.close()
    first.close()
print('PASS SQLite transactions enforce foreign keys')

repository_source = (root / 'apps/mobile/src/data/openEntryRepository.ts').read_text()
transaction_source = (root / 'apps/mobile/src/data/writeTransaction.ts').read_text()
assert 'useNewConnection: true' in repository_source
assert 'createWriteTransaction(db)' in repository_source
assert 'openDatabaseAsync' not in transaction_source
assert "BEGIN IMMEDIATE" in transaction_source and "COMMIT" in transaction_source and "ROLLBACK" in transaction_source
print('PASS repository owns one SQLite connection for reads, writes, and shutdown')

generated = root / 'apps/mobile/src/data/schema.generated.ts'
if generated.exists():
    expected = '// Generated by scripts/build_schema.py. Do not edit.\nexport const schema = ' + json.dumps((root / 'specs/schema.sql').read_text(), ensure_ascii=False) + ';\n'
    expected += 'export const migrations: Record<number, string> = ' + json.dumps({int(p.name.split('-')[0]): p.read_text() for p in sorted((root / 'specs/migrations').glob('*.sql'))}, ensure_ascii=False) + ';\n'
    assert generated.read_text() == expected, 'Run scripts/build_schema.py after changing SQL'
    print('PASS runtime SQL matches its single source')
