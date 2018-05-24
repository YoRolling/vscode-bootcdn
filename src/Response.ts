import { Uri } from 'vscode';

export interface Library {
    name: string;
    npmName: string;
    version: string;
    description: string;
    homepage: Uri;
    keywords: string[];
    namespace: string;
    repository: {
        type: string;
        url: Uri;
    };
    license: string;
    assets: {
        version: string;
        files: string[];
    }[];
    stars: number;
}


