import { BaseEntity } from "./types";

let idCounter = 1000;

function generateId(): string {
  return String(++idCounter);
}

function now(): string {
  return new Date().toISOString();
}

export class MockEntityStore<T extends BaseEntity> {
  private items: T[];
  private name: string;

  constructor(name: string, initialData: Omit<T, "id" | "created_date" | "updated_date">[] = []) {
    this.name = name;
    this.items = initialData.map((item, index) => ({
      ...item,
      id: String(index + 1),
      created_date: new Date(Date.now() - (initialData.length - index) * 86400000).toISOString(),
      updated_date: new Date(Date.now() - (initialData.length - index) * 86400000).toISOString(),
    } as T));
  }

  async list(): Promise<T[]> {
    return [...this.items];
  }

  async filter(criteria: Partial<T>, sort?: string): Promise<T[]> {
    let results = this.items.filter((item) => {
      return Object.entries(criteria).every(([key, value]) => {
        if (value === undefined || value === null) return true;
        return (item as Record<string, unknown>)[key] === value;
      });
    });

    if (sort) {
      const desc = sort.startsWith("-");
      const field = desc ? sort.slice(1) : sort;
      results = [...results].sort((a, b) => {
        const aVal = (a as Record<string, unknown>)[field];
        const bVal = (b as Record<string, unknown>)[field];
        if (aVal === bVal) return 0;
        if (aVal === undefined || aVal === null) return 1;
        if (bVal === undefined || bVal === null) return -1;
        const cmp = String(aVal).localeCompare(String(bVal));
        return desc ? -cmp : cmp;
      });
    }

    return results;
  }

  async get(id: string): Promise<T | null> {
    return this.items.find((item) => item.id === id) || null;
  }

  async create(data: Partial<Omit<T, "id" | "created_date" | "updated_date">>): Promise<T> {
    const item = {
      ...data,
      id: generateId(),
      created_date: now(),
      updated_date: now(),
    } as T;
    this.items.push(item);
    return item;
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index === -1) return null;
    this.items[index] = {
      ...this.items[index],
      ...data,
      id,
      updated_date: now(),
    };
    return this.items[index];
  }

  async delete(id: string): Promise<boolean> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index === -1) return false;
    this.items.splice(index, 1);
    return true;
  }

  async bulkCreate(dataArray: Partial<Omit<T, "id" | "created_date" | "updated_date">>[]): Promise<T[]> {
    const created: T[] = [];
    for (const data of dataArray) {
      const item = await this.create(data);
      created.push(item);
    }
    return created;
  }
}
