import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RegionsService {
  constructor(private readonly prisma: PrismaService) {}

  // Get all provinces (level 1)
  async getProvinces() {
    return this.prisma.region.findMany({
      where: { level: 1 },
      orderBy: { code: 'asc' },
      select: { id: true, name: true, code: true, level: true },
    });
  }

  // Get cities under a province
  async getCities(provinceId: string) {
    return this.prisma.region.findMany({
      where: { parentId: provinceId, level: 2 },
      orderBy: { code: 'asc' },
      select: { id: true, name: true, code: true, level: true },
    });
  }

  // Get counties under a city
  async getCounties(cityId: string) {
    return this.prisma.region.findMany({
      where: { parentId: cityId, level: 3 },
      orderBy: { code: 'asc' },
      select: { id: true, name: true, code: true, level: true },
    });
  }

  // Get full region tree (for admin)
  async getTree() {
    const all = await this.prisma.region.findMany({
      orderBy: { code: 'asc' },
    });

    const map = new Map<string, any>();
    const roots: any[] = [];

    for (const r of all) {
      map.set(r.id, { ...r, children: [] });
    }

    for (const r of all) {
      if (r.parentId) {
        map.get(r.parentId)?.children.push(map.get(r.id));
      } else {
        roots.push(map.get(r.id));
      }
    }

    return roots;
  }

  async findById(id: string) {
    return this.prisma.region.findUnique({ where: { id } });
  }
}
