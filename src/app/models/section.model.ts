export interface Section {
  isFixed: boolean;
  id: string;
  title: string;
  order: number;
  selectedSort?: 'default' | 'dueDate' | 'priority';
}
