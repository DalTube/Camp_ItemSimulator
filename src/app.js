import express from express;
import prisma from prisma;

// 1. express 연결
const app = express();
const PORT = 3000;

// 2. 데이터베이스 연결

// 3. Middleware 추가

// 4. Router 추가

// 5. Listen 
app.listen(PORT,()=>{
    console.log(PORT,"아이템 시뮬레이터 서버 ON");
});

// 6. Error Handler Middleware 추가