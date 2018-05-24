'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { commands, window, ExtensionContext } from 'vscode';
import * as Utils from './Utils/Utils';
import { Library } from './Response';

const Cache = require('vscode-cache');
export function activate(context: ExtensionContext) {
    
    const extenstionCache = new Cache(context, 'libraries');
    let searchDisposable = commands.registerCommand('extension.search', () => {
        let choosen: any = {};
        let $q: Promise<string[][]>;
        if (extenstionCache.get('libraries')) {
            $q = Promise.resolve(extenstionCache.get('libraries'));
        } else {
            $q = Utils.loadLibrariesAssets();
            window.setStatusBarMessage('load libraries...', $q);
        }
        $q
            .then(res => {
                // 展示可用library
                return Utils.showSearchInput(res);
            })
            .then((library: { label: string; description: string }) => {
                // 获取library 详情
                choosen.library = library.label;
                return Utils.loadLibraryAssets(library.label, context);
            })
            .then((res: Library) => {
                // 处理所有可用版本
                choosen.assert = res.assets;
                return res.assets.map(v => {
                    return v.version;
                });
            })
            .then(versions => {
                // 选择版本
                return Utils.quickAssetsVersion(versions);
            })
            .then((version: string) => {
                // 查找对应的版本的资源列表
                const target = choosen.assert.find(
                    (v: any) => v.version === version
                );
                return Utils.pickAssetFiles(target);
            })
            .then((result: { version: string; files: string[] }) => {
                // 插入
                const config = {
                    library: choosen.library,
                    ...result
                };
                Utils.insertText(config);
            })
            .catch(err => {
                switch (err.code) {
                    case 410:
                        break;
                    default:
                        window.showErrorMessage(err.message || 'unknown error');
                }
            });
    });
    context.subscriptions.push(searchDisposable);

    let cleanDisposable = commands.registerCommand('extension.clean', () => {
        extenstionCache.flush().then(
            () => {
                window.showInformationMessage('bootcdn 缓存已清除');
            },
            (error: any) => {
                window.showErrorMessage(error.message || 'unknown error');
            }
        );
    });
    context.subscriptions.push(cleanDisposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
