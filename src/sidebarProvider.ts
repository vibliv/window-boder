import * as vscode from 'vscode';

interface ColorPreset {
    name: string;
    color: string;
}

interface ExtensionState {
    presets: ColorPreset[];
    recentColors: string[];
}

export class ColorSidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'window-border.colorPalette';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _state: ExtensionState,
        private readonly _onColorSelected: (color: string) => void,
        private readonly _onAddNewColor: (color: string) => void
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ): void {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview();

        webviewView.webview.onDidReceiveMessage(async (data: { type: string; value?: string }) => {
            switch (data.type) {
                case 'colorSelected': {
                    if (data.value) {
                        this._onColorSelected(data.value);
                    }
                    break;
                }
                case 'colorPicked': {
                    if (data.value) {
                        this._onAddNewColor(data.value);
                    }
                    break;
                }
            }
        });
    }

    private _getHtmlForWebview(): string {
        const presets: ColorPreset[] = this._state.presets || [];
        const recentColors: string[] = this._state.recentColors || [];

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Color Palette</title>
                <style>
                    body {
                        padding: 10px;
                        font-family: var(--vscode-font-family);
                        color: var(--vscode-foreground);
                    }
                    .section {
                        margin-bottom: 20px;
                    }
                    .section-title {
                        font-size: 14px;
                        font-weight: bold;
                        margin-bottom: 10px;
                    }
                    .color-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
                        gap: 8px;
                    }
                    .color-item {
                        aspect-ratio: 1;
                        border-radius: 4px;
                        cursor: pointer;
                        border: 2px solid transparent;
                        transition: all 0.2s;
                        position: relative;
                    }
                    .color-item:hover {
                        transform: scale(1.1);
                        border-color: var(--vscode-focusBorder);
                        z-index: 1;
                    }
                    .tooltip {
                        position: absolute;
                        background: var(--vscode-editor-background);
                        color: var(--vscode-foreground);
                        padding: 4px 8px;
                        border-radius: 4px;
                        font-size: 12px;
                        bottom: 100%;
                        left: 50%;
                        transform: translateX(-50%);
                        white-space: nowrap;
                        opacity: 0;
                        pointer-events: none;
                        transition: opacity 0.2s;
                        border: 1px solid var(--vscode-widget-border);
                    }
                    .color-item:hover .tooltip {
                        opacity: 1;
                    }
                    .color-picker-container {
                        margin: 15px 0;
                        padding: 10px;
                        background: var(--vscode-editor-background);
                        border-radius: 6px;
                        border: 1px solid var(--vscode-widget-border);
                    }
                    .color-picker-row {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        margin-bottom: 10px;
                    }
                    #colorPicker {
                        width: 50px;
                        height: 50px;
                        padding: 0;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                    }
                    #colorPicker::-webkit-color-swatch-wrapper {
                        padding: 0;
                    }
                    #colorPicker::-webkit-color-swatch {
                        border: none;
                        border-radius: 4px;
                    }
                    #hexValue {
                        flex: 1;
                        background: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        border: 1px solid var(--vscode-input-border);
                        padding: 4px 8px;
                        border-radius: 4px;
                        font-family: var(--vscode-editor-font-family);
                    }
                    button {
                        width: 100%;
                        padding: 8px;
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        margin: 8px 0;
                    }
                    button:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                </style>
            </head>
            <body>
                <div class="color-picker-container">
                    <div class="section-title">Seleccionar Nuevo Color</div>
                    <div class="color-picker-row">
                        <input type="color" id="colorPicker" value="#FF0000">
                        <input type="text" id="hexValue" value="#FF0000" maxlength="7">
                    </div>
                    <button onclick="applySelectedColor()">Aplicar Color</button>
                </div>

                <div class="section">
                    <div class="section-title">Presets</div>
                    <div class="color-grid">
                        ${presets.map((preset: ColorPreset) => `
                            <div 
                                class="color-item" 
                                style="background-color: ${preset.color};"
                                onclick="selectColor('${preset.color}')"
                                title="${preset.name}"
                            >
                                <div class="tooltip">${preset.name}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                ${recentColors.length > 0 ? `
                    <div class="section">
                        <div class="section-title">Colores Recientes</div>
                        <div class="color-grid">
                            ${recentColors.map((color: string) => `
                                <div 
                                    class="color-item" 
                                    style="background-color: ${color};"
                                    onclick="selectColor('${color}')"
                                    title="${color}"
                                >
                                    <div class="tooltip">${color}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <script>
                    const vscode = acquireVsCodeApi();
                    const colorPicker = document.getElementById('colorPicker');
                    const hexValue = document.getElementById('hexValue');
                    
                    colorPicker.addEventListener('input', function(e) {
                        hexValue.value = e.target.value.toUpperCase();
                    });

                    hexValue.addEventListener('input', function(e) {
                        const value = e.target.value;
                        if (/^#[0-9A-F]{6}$/i.test(value)) {
                            colorPicker.value = value;
                        }
                    });

                    hexValue.addEventListener('blur', function(e) {
                        const value = e.target.value;
                        if (!/^#[0-9A-F]{6}$/i.test(value)) {
                            hexValue.value = colorPicker.value.toUpperCase();
                        }
                    });

                    function selectColor(color) {
                        vscode.postMessage({ type: 'colorSelected', value: color });
                    }

                    function applySelectedColor() {
                        const color = colorPicker.value.toUpperCase();
                        vscode.postMessage({ type: 'colorPicked', value: color });
                    }
                </script>
            </body>
            </html>`;
    }

    public update(): void {
        if (this._view) {
            this._view.webview.html = this._getHtmlForWebview();
        }
    }
}