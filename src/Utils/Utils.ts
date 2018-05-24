import {
    window,
    ExtensionContext,
    TextEdit,
    Selection,
    WorkspaceEdit,
    workspace,
    TextEditor
} from 'vscode';
import { Library } from '../Response';
const path = require('path');
import { EOL } from 'os';

const request = require('request-promise-native');
const tpl = 'https://api.bootcdn.cn/libraries/[name].min.json';
const baseUrl = 'https://cdn.bootcss.com/';

let options = {
    uri: '',
    json: true // Automatically parses the JSON string in the response
};

export interface Selection {
    library: string;
}

export interface Item {
    label: string;
    description: string;
}
/**
 * @author YoRolling
 * @param library the library name
 * @description load the library assets from cdn server
 * @since 1.0.0
 * @version 1.0.0
 * @see https://api.bootcdn.cn/libraries/[name].json
 */
export function loadLibraryAssets(
    library: string | undefined,
    context: ExtensionContext
): Promise<Library> {
    if (!(library === undefined || library === '')) {
        let newUri = tpl.replace('[name]', library);
        options.uri = newUri;
        return request(options);
    } else {
        return Promise.reject({
            code: 410,
            message: 'no library '
        });
    }
}

/**
 * @author YoRolling
 * @param { string[] } versiones the choosed library assets version
 * @description show quick pick for the library
 * @since 1.0.0
 * @version 1.0.0
 */
export function quickAssetsVersion(
    versiones: string[] | Thenable<string[]>
): Promise<string> {
    return new Promise((resolve, reject) => {
        window
            .showQuickPick(versiones, {
                canPickMany: false
            })
            .then(
                value => {
                    if (value === undefined) {
                        reject({
                            code: 410,
                            message: 'no version excepte'
                        });
                    } else {
                        resolve(value);
                    }
                },
                err => {
                    reject(err);
                }
            );
    });
}

/**
 * @description choose which asset files will be used
 * @author YoRolling
 * @export
 * @param {string} version which version that been choosed
 * @since 1.0.0
 * @version 1.0.0
 * @returns {Thenable<string[]>}
 */
export function chooseAssetFiles(
    version: string
): Thenable<string[] | undefined> {
    return window.showQuickPick([], { canPickMany: true });
}

/**
 * @description
 * @author YoRolling
 * @export
 * @param {ExtensionContext} context
 * @returns {Promise<Item>}
 */
export function showSearchInput(res: string[][]): Promise<Item> {
    return new Promise((resolve, reject) => {
        let options = [];
        options = res.map((v: any[]) => {
            return {
                label: v[0],
                description: v[1]
            };
        });
        window.showQuickPick(options).then(
            (value: any) => {
                // No search string was specified
                if (value === undefined) {
                    reject({
                        code: 410,
                        message: 'No search string was specified'
                    });
                } else {
                    resolve(value);
                }
            },
            err => {
                reject(err);
            }
        );
    });
}

/**
 * @description load all valid libraries
 * @author YoRolling
 * @export
 * @param {ExtensionContext} context
 * @since 1.0.0
 * @version 1.0.0
 * @returns {Promise<string[][]>}
 */
export function loadLibrariesAssets(): Promise<string[][]> {
    return request({
        uri: 'https://api.bootcdn.cn/libraries.min.json',
        json: true // Automatically parses the JSON string in the response
    });
}

/**
 * @description pickup which file[s] to use
 * @author YoRolling
 * @export
 * @param {string[]} items
 * @returns {Promise<string[]>}
 */
export function pickAssetFiles(target: {
    version: string;
    files: string[];
}): Promise<{
    version: string;
    files: string[];
}> {
    return new Promise((resolve, reject) => {
        console.log(target);
        window
            .showQuickPick(target.files, {
                canPickMany: true
            })
            .then(
                (files: string[] | undefined) => {
                    if (files === undefined || files.length === 0) {
                        reject({
                            code: 410,
                            message: 'no file found'
                        });
                    } else {
                        const version: string = target.version;
                        resolve({ version, files });
                    }
                },
                error => {
                    reject(error);
                }
            );
    });
}

// Insert text into active document at cursor positions
export function insertText(resource: {
    library: string;
    version: string;
    files: string[];
}) {
    let textEditor: TextEditor | undefined = window.activeTextEditor;

    // Ignore if no active TextEditor
    if (textEditor === undefined) {
        return false;
    }

    // Get the active text document's uri
    let uri = textEditor.document.uri;

    // Create a new TextEdit for each selection
    let edits: TextEdit[] = [];
    textEditor.selections.forEach((selection: Selection) => {
        edits.push(TextEdit.insert(selection.active, EOL));
        resource.files.forEach(v => {
            let textEdit: TextEdit | undefined = undefined;
            let absUrl = `${baseUrl}${resource.version}${v}`;

            switch (path.extname(absUrl)) {
                case '.css':
                case '.scss':
                case '.sass':
                case '.less':
                    textEdit = TextEdit.insert(
                        selection.active,
                        `<link rel='stylesheet' href='${baseUrl}${resource.library}/${
                            resource.version
                        }/${v}'/>`
                    );
                    break;
                case '.js':
                case '.jsm':
                case '.jsx':
                case '.json':
                    textEdit = TextEdit.insert(
                        selection.active,
                        `<script src='${baseUrl}${resource.library}/${
                            resource.version
                        }/${v}'></script>`
                    );
                    break;
                default:
                    break;
            }
            if (textEdit !== undefined) {
                edits.push(textEdit);
                edits.push(TextEdit.insert(selection.active, EOL));
            }
        });
    });

    // New WorkspaceEdit
    let edit = new WorkspaceEdit();
    edit.set(uri, edits);

    // Applying the WorkspaceEdit
    workspace.applyEdit(edit).then(
        () => {
            // Clear the selection

            (<TextEditor>textEditor).selection = new Selection(
                (<TextEditor>textEditor).selection.end,
                (<TextEditor>textEditor).selection.end
            );
        },
        err => {
            // reject(err);
        }
    );

    return true;
}
