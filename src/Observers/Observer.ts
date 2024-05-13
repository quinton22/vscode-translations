import { Observable } from './types';

export class Observer<T> implements Observable<T> {
  private subscriptions: ((value: T) => void)[] = [];
  protected _current?: T;

  public subscribe(fn: (value: T) => void) {
    const len = this.subscriptions.push(fn);
    return () => {
      this.subscriptions.splice(len - 1, 1);
    };
  }

  protected next(value: T) {
    this._current = value;
    this.subscriptions.forEach((fn) => fn(value));
  }

  public removeAllSubscriptions() {
    this.subscriptions = [];
  }
}
