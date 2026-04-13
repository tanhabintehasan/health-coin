import { PrismaClient } from '@prisma/client'

const regions = [
  { id: 'prov-bj', name: '北京市', code: '110000', level: 1, parentId: null },
  { id: 'prov-sh', name: '上海市', code: '310000', level: 1, parentId: null },
  { id: 'prov-gd', name: '广东省', code: '440000', level: 1, parentId: null },
  { id: 'prov-zj', name: '浙江省', code: '330000', level: 1, parentId: null },
  { id: 'prov-js', name: '江苏省', code: '320000', level: 1, parentId: null },
  { id: 'city-bj-dc', name: '东城区', code: '110101', level: 2, parentId: 'prov-bj' },
  { id: 'city-bj-xc', name: '西城区', code: '110102', level: 2, parentId: 'prov-bj' },
  { id: 'city-bj-cy', name: '朝阳区', code: '110105', level: 2, parentId: 'prov-bj' },
  { id: 'city-sh-hp', name: '黄浦区', code: '310101', level: 2, parentId: 'prov-sh' },
  { id: 'city-sh-xh', name: '徐汇区', code: '310104', level: 2, parentId: 'prov-sh' },
  { id: 'city-gz', name: '广州市', code: '440100', level: 2, parentId: 'prov-gd' },
  { id: 'city-sz', name: '深圳市', code: '440300', level: 2, parentId: 'prov-gd' },
  { id: 'county-gz-th', name: '天河区', code: '440106', level: 3, parentId: 'city-gz' },
  { id: 'county-gz-yx', name: '越秀区', code: '440104', level: 3, parentId: 'city-gz' },
  { id: 'county-sz-ft', name: '福田区', code: '440304', level: 3, parentId: 'city-sz' },
  { id: 'county-sz-ns', name: '南山区', code: '440305', level: 3, parentId: 'city-sz' },
]

export default async function seed(prisma: PrismaClient) {
  console.log('Seeding regions...')
  for (const region of regions) {
    await prisma.region.upsert({
      where: { code: region.code },
      update: {},
      create: region,
    })
  }
  console.log(`Seeded ${regions.length} regions`)
}
