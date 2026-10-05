# -*- coding: utf-8 -*-
"""清理 uploads/ 里的孤儿文件（磁盘有、DB uploads.stored_path 无）"""
import os, sqlite3

UPLOADS = '/root/freddy-epr/uploads'
DB = '/root/freddy-epr/database/data.db'

db = sqlite3.connect(DB)
db_paths = set(r[0] for r in db.execute("SELECT stored_path FROM uploads WHERE stored_path IS NOT NULL AND stored_path != ''"))
db.close()

disk_files = [f for f in os.listdir(UPLOADS) if os.path.isfile(os.path.join(UPLOADS, f))]
orphans = [f for f in disk_files if f not in db_paths]

total = 0
for f in orphans:
    fp = os.path.join(UPLOADS, f)
    size = os.path.getsize(fp)
    total += size
    os.remove(fp)
    print(f'删除孤儿: {f}  ({size} 字节)')

print(f'共清理 {len(orphans)} 个孤儿文件，释放 {total} 字节 ({round(total/1024/1024,1)} MB)')
