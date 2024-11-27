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

#### Todo

---

1. 데이터베이스 모델링
   - 아이템 테이블
     - 아이템 생성 API를 통해 생성된 아이템 정보는 아이템 테이블에 저장되어야 합니다.
   - 계정 테이블
   - 캐릭터 테이블
     - 하나의 계정은 여러개의 캐릭터를 보유할 수 있어요!
   - 캐릭터-인벤토리 테이블
     - 캐릭터가 보유는 하고있으나 장착하고 있지 않은 아이템 정보들이 담겨져있겠죠?
   - 캐릭터-아이템 테이블
     - 이 테이블엔 실제로 캐릭터가 장착한 아이템 정보들이 존재해야 합니다.
