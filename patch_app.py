import sys

path = r'D:\kurukshetra\server\src\app.ts'
with open(path, 'r', encoding='utf-8') as f:
    s = f.read()

if 'challengesRouter' not in s:
    s2 = s.replace('import { kingdomsRouter } from \"./routes/kingdoms.js\";',
                   'import { kingdomsRouter } from \"./routes/kingdoms.js\";\nimport { challengesRouter } from \"./routes/challenges.js\";')
    s2 = s2.replace('  app.use(\"/api/v1/kingdoms\", kingdomsRouter);',
                    '  app.use(\"/api/v1/kingdoms\", kingdomsRouter);\n  app.use(\"/api/v1/challenges\", challengesRouter);')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(s2)
    print('ok')
else:
    print('exists')