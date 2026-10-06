export type LilithGalleryItem = {
  id: string;
  title: string;
  caption: string;
  src: string;
  alt: string;
  visibility: 'public';
};

export const lilithPublicProfile = {
  name: '莉莉丝',
  adult: true,
  age: 19,
  heightCm: 169,
  summary: '清纯、漂亮、安静，却始终保留一层危险的距离感。',
  signatures: [
    '暗红虹膜内圈：只在近距离和侧光里显现，不做夸张发光。',
    '浅蓝乳白色五角星吊坠：小巧、闪亮，保留手工银丝结构。',
    '现代日常服装：白 T、吊带、百褶裙和牛仔单品都可以变化。',
  ],
  states: [
    {
      id: 'high-ponytail',
      name: '高马尾',
      description: '柔黑细发束与空气感刘海，轮廓清爽而高挑。',
      image: '/assets/lilith/state-default.jpg',
    },
    {
      id: 'loose-hair',
      name: '披发',
      description: '保持同一张脸与同一套刘海，气质更安静、更接近日常。',
      image: '/assets/lilith/state-alternate.jpg',
    },
  ],
  visual: {
    hero: '/assets/lilith/state-default.jpg',
    portrait: '/assets/lilith/portrait-reference.jpg',
    pendant: '/assets/lilith/pendant-reference.jpg',
  },
} as const;

export const lilithArchiveProfile = {
  identity: {
    name: '莉莉丝',
    age: 19,
    adult: true,
    heightCm: 169,
    headToBodyRatio: '约 7.9 头身',
    body: 'Body Ver.3：高挑小骨架、窄肩、窄胯、修长比例。',
  },
  face: {
    shape: '略窄、柔和的鹅蛋脸；下巴短而圆润，颌线自然。',
    eyes: '偏大但保持真人比例，眼距自然略宽，外眼角微微下垂。',
    iris: '浅冷灰蓝/冰蓝，内圈有低饱和暗红色。',
    skin: '冷白、透亮，保留轻微真实皮肤质感。',
    makeup: '素雅、低存在感，只保留自然睫毛和低饱和唇色。',
  },
  hair: {
    color: '柔黑，光线下有极轻微冷棕反光。',
    bangs: '轻薄柔软的自然碎刘海，保留自然分缝，眉眼清晰可见。',
    default: '高马尾：头顶偏后位置束起，发根自然蓬松。',
    alternate: '披发：自然披落到肩部和上背，细发束分明。',
    forbidden: '厚重齐刘海、整片刘海、塑料感和湿发粘连。',
  },
  pendant: {
    material: '半透明乳白淡蓝材质，明亮、闪光但不过度发光。',
    shape: '五个圆润尖角的五角星。',
    size: '宽约 20mm、厚约 4.5mm，精致小巧。',
    connection: '顶部附近单一凹处连接，约 2–3 条极细、疏松银丝。',
    placement: '链长约 42–45cm，吊坠中心位于锁骨下约 2–3cm。',
    forbidden: '双连接点、密集银丝蛛网、金属框和线框五角星。',
    handling: '人物本体与项链分层处理，最终使用独立项链母图合成。',
  },
  outfits: {
    default: '白色短款细肩带吊带背心、宽松滑肩白衬衫、浅蓝高腰工装牛仔裤、厚底白色运动鞋。',
    alternate: '白色短款吊带背心、宽松白衬衫、浅蓝高腰毛边牛仔短裤、厚底白色运动鞋。',
  },
  promptEntry: {
    version: 'Prompt Pack v1.4',
    referenceOrder: ['脸部与发型', 'Body Ver.3', '项链结构', '项链合成', '自然微犬牙', '默认服装'],
    core: '19岁成年女性，高马尾或披发，柔黑细发束与空气感刘海，Body Ver.3，保持同一张脸与同一套人物比例。',
    compositing: '脸、发型、身体、犬牙和项链按各自母版分区调用；项链必须单独处理，全身生成不自由重画项链。',
    negative: 'different person, identity drift, teenage appearance, old woman, V-shaped face, pointed chin, thick blunt bangs, plastic hair, vampire fangs, dense silver wire web, dual pendant attachment, text, watermark',
  },
  revisions: [
    { title: 'v5.5 视觉资产最终验收', status: 'current', date: '2026-09-23', summary: '默认高马尾与披发备用状态完成冻结；项链继续独立管理。' },
    { title: 'v5.4 新增备用状态', status: 'historical', date: '2026-09-23', summary: '新增披发与毛边牛仔短裤备用造型，不替换默认工装裤。' },
    { title: '项链 V1.2 结构修订', status: 'historical', date: '2026-09-16', summary: '改为顶部附近单一凹处连接和约 2–3 条稀疏银丝。' },
    { title: 'FINAL V1.1 视觉一致性修订', status: 'historical', date: '2026-09-16', summary: '锁定蓝瞳、柔黑高马尾、Body Ver.3、自然微犬牙和脸型防漂移规则。' },
  ],
} as const;

export const lilithGalleryItems: LilithGalleryItem[] = [
  {
    id: 'portrait-reference',
    title: '日常目光',
    caption: '她看起来很容易靠近，但暗红色的内圈提醒你，她始终在观察。',
    src: lilithPublicProfile.visual.portrait,
    alt: '莉莉丝高马尾与浅色服装的日常肖像参考',
    visibility: 'public',
  },
  {
    id: 'pendant-reference',
    title: '浅蓝五角星',
    caption: '一枚被细银丝留下的、明亮而精致的私人标记。',
    src: lilithPublicProfile.visual.pendant,
    alt: '莉莉丝半透明浅蓝五角星吊坠与银丝结构参考',
    visibility: 'public',
  },
  {
    id: 'hero-atmosphere',
    title: '暗色回声',
    caption: '她的危险感不靠夸张符号，只藏在光线和距离里。',
    src: lilithPublicProfile.visual.hero,
    alt: '莉莉丝暗色展览氛围肖像',
    visibility: 'public',
  },
];
