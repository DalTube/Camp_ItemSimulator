import express from 'express';
import { prisma } from '../utils/prisma/index.js';

const router = express.Router();

/*** 아이템 생성 */
router.post('/item', async (req, res, next) => {
  try {
    const { itemCode, itemType, itemName, itemStatus, itemPrice } = req.body;

    // 1. 입력 값 체크
    if (!itemType && itemType !== 0) return res.status(400).json({ message: '아이템 유형은 필수 입력 입니다.' });
    if (!itemCode) return res.status(400).json({ message: '아이템 코드은 필수 입력 입니다.' });

    // 0:일반 1:무기 2:머리 3:몸 4:신발 5:악세
    if (itemType > 6) return res.status(400).json({ message: '아이템 유형의 유효 값은 0 ~ 5 입니다.' });
    if (!itemName) return res.status(400).json({ message: '아이템 이름은 필수 입력 입니다.' });
    if (!itemPrice) return res.status(400).json({ message: '아이템 가격은 필수 입력 입니다.' });

    let health = 0;
    let power = 0;

    if (itemStatus) {
      health = itemStatus.health ? itemStatus.health : 0;
      power = itemStatus.power ? itemStatus.power : 0;
    }

    // 2. 아이템 생성
    await prisma.item.create({ data: { itemCode, itemType, itemName, itemPrice, health: health, power: power } });

    // 3. 결과
    return res.status(201).json({ message: '아이템을 생성하였습니다.' });
  } catch (error) {
    next(error);
  }
});

/*** 아이템 수정 */
router.patch('/item/:itemCode', async (req, res, next) => {
  try {
    const { itemCode } = req.params;
    const { itemName, itemStatus, itemType, itemPrice } = req.body;

    // 1. 입력 값 체크
    if (!itemName && !itemStatus && !itemType) return res.status(202).json({ message: '변경할 정보가 입력되지 않았습니다.' });
    if (itemPrice) return res.status(400).json({ message: '아이템 가격은 변경할 수 없습니다.' });

    // 2. 아이템 존재 여부 체크
    const item = await prisma.item.findFirst({ where: { itemCode: +itemCode } });
    if (!item) return res.status(404).json({ message: '해당 아이템이 존재하지 않습니다.' });

    // data 객체 처리
    let objData = {};
    if (itemName) objData.itemName = itemName;
    if (itemType) objData.itemType = itemType;
    if (itemStatus) {
      if (itemStatus.health) objData.health = itemStatus.health;
      if (itemStatus.power) objData.power = itemStatus.power;
    }

    // 3. 수정
    await prisma.item.update({
      where: { itemCode: +itemCode },
      data: objData,
    });

    return res.status(200).json({ message: '아이템 정보를 변경하였습니다.' });
  } catch (error) {
    next(error);
  }
});

/*** 아이템 목록 조회 */
router.get('/item', async (req, res, next) => {
  try {
    // 1. 아이템 조회
    const item = await prisma.item.findMany({ orderBy: { itemCode: 'asc' }, select: { itemCode: true, itemType: true, itemName: true, health: true, power: true, itemPrice: true } });

    // 2. 결과 처리
    if (!item) return res.status(200).json({ message: '생성된 아이템이 없습니다.' });
    else return res.status(200).json(item);
  } catch (error) {
    next();
  }
});

/*** 아이템 상세 조회 */
router.get('/item/:itemCode', async (req, res, next) => {
  try {
    const { itemCode } = req.params;

    // 1. 아이템 조회
    const item = await prisma.item.findFirst({ where: { itemCode: +itemCode }, select: { itemCode: true, itemType: true, itemName: true, health: true, power: true, itemPrice: true } });

    // 2. 결과 처리
    if (!item) return res.status(404).json({ message: '해당 아이템이 존재하지 않습니다.' });
    else return res.status(200).json(item);
  } catch (error) {
    next();
  }
});

export default router;
