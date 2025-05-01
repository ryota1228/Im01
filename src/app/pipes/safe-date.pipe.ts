import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'safeDate', standalone: true })
export class SafeDatePipe implements PipeTransform {
  transform(value: any): Date | null {
    if (!value) return null;

    if (value instanceof Date) return value;

    if (value.seconds !== undefined && value.nanoseconds !== undefined) {
      return new Date(value.seconds * 1000 + Math.floor(value.nanoseconds / 1_000_000));
    }

    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
}