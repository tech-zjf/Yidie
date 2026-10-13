#!/usr/bin/env python3
"""Validate the planning packet; not an iOS test suite."""
from pathlib import Path
import re
import sqlite3
import subprocess
import tempfile

root = Path(__file__).resolve().parents[1]
tracked = subprocess.check_output(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], cwd=root).decode().split('\0')
for name in set(tracked):
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
db.execute("INSERT INTO processing_jobs VALUES('j','a','queued',0,0,NULL,'now','now')")
db.execute("DELETE FROM entries WHERE id='a'")
assert db.execute('SELECT count(*) FROM processing_jobs').fetchone()[0] == 0
assert db.execute("SELECT cover_entry_id FROM days WHERE record_date='2026-06-13'").fetchone()[0] is None
assert db.execute('PRAGMA foreign_key_check').fetchall() == []
db.commit()
print('PASS SQL: cover ownership, pending date, ready invariant, move/delete and job cascade')

fragment = (root / 'design/prototype.fragment.html').read_text()
assert '__SPRITE_DATA__' not in fragment
assert len(fragment.encode()) < 1_000_000
assert not re.search(r'\b(fetch\s*\(|XMLHttpRequest|WebSocket)', fragment)
js = '\n'.join(re.findall(r'<script>([\s\S]*?)</script>', fragment))
with tempfile.TemporaryDirectory() as temp:
    path = Path(temp) / 'prototype.js'
    path.write_text(js)
    subprocess.run(['node','--check',str(path)], check=True)
print('PASS prototype: embedded images, size, no network calls, JavaScript syntax')
