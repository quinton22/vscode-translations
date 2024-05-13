import { WorkspaceConfiguration, workspace } from 'vscode';
import { Observer } from './Observer';

export class ConfigObserver extends Observer<WorkspaceConfiguration> {
  private _section;
  private disposable;

  get current() {
    return this._current;
  }

  constructor(section?: string) {
    super();
    this._section = 'translations' + section ? `.${section}` : '';
    this.next(workspace.getConfiguration(this._section));
    this.disposable = workspace.onDidChangeConfiguration(
      (e) =>
        e.affectsConfiguration(this._section) &&
        this.next(workspace.getConfiguration(this._section)),
      this
    );
  }

  dispose() {
    this.removeAllSubscriptions();
    this.disposable.dispose();
  }
}
