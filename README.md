# Node.js와 Express.js를 활용한 나만의 게임 아이템 시뮬레이터 서비스 만들기 과제

---

```bash
yarn init -y
yarn add express
yarn add jsonwebtoken
yarn add cookie-parser

yarn add prisma @prisma/client
npx prisma init

yarn add ysql2

yarn add winston
yarn add bcrypt

yarn add express-session
yarn add express-mysql-session
```

# yarn 프로젝트를 초기화합니다.

yarn init -y

# express, prisma, @prisma/client 라이브러리를 설치합니다.

yarn add express prisma @prisma/client

# nodemon 라이브러리를 DevDependency로 설치합니다.

yarn add -D nodemon

# 설치한 prisma를 초기화 하여, prisma를 사용할 수 있는 구조를 생성합니다.

npx prisma init
