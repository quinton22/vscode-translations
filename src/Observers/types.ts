export interface Observable<T> {
  subscribe: (fn: (value: T) => void) => () => void;
}

export interface Subject<T> extends Observable<T> {
  next: (value: T) => void;
  current?: T;
}
