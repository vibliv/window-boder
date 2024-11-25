import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ColorSidebarProvider } from './sidebarProvider';

interface ColorPreset {
    name: string;
    color: string;
}

interface WorkspaceSettings {
    'window-border.color'?: string;
    [key: string]: any;
}

interface ExtensionState {
    presets: ColorPreset[];
    recentColors: string[];
}

interface QuickPickItem extends vscode.QuickPickItem {
    color?: string;
}

const DEFAULT_PRESETS: ColorPreset[] = [
    { name: "Ruby Red", color: "#E52B50" },
    { name: "Sapphire Blue", color: "#0F52BA" },
    { name: "Emerald Green", color: "#50C878" },
    { name: "Purple Amethyst", color: "#9966CC" },
    { name: "Amber Gold", color: "#FFB200" },
    { name: "Dark Mode", color: "#1E1E1E" },
    { name: "Light Mode", color: "#FFFFFF" }
];

async function addNewColorWithName(state: ExtensionState, context: vscode.ExtensionContext): Promise<boolean> {
    const colorInput = await vscode.window.showInputBox({
        prompt: 'Introduce el color en formato hex (ej: #FF0000)',
        placeHolder: '#RRGGBB',
        validateInput: (value) => {
            return /^#[0-9A-Fa-f]{6}$/.test(value) ? null : 'Por favor, introduce un color válido en formato hex (#RRGGBB)';
        }
    });

    if (!colorInput) {
        return false;
    }

    const nameInput = await vscode.window.showInputBox({
        prompt: 'Nombre para el color (opcional)',
        placeHolder: 'Ej: Mi Color Favorito'
    });

    const name = nameInput || colorInput;

    if (nameInput) {
        state.presets = state.presets || [];
        state.presets.push({
            name: name,
            color: colorInput
        });
        await context.globalState.update('windowBorderState', state);
    }

    await setWorkspaceColor(colorInput, state);
    
    const action = nameInput 
        ? `Color "${name}" guardado y aplicado` 
        : 'Color aplicado';
    
    vscode.window.showInformationMessage(action);
    
    return true;
}

export function activate(context: vscode.ExtensionContext) {
    let state = context.globalState.get('windowBorderState', {
        presets: DEFAULT_PRESETS,
        recentColors: []
    });

    // Registrar el proveedor de la barra lateral
    const sidebarProvider = new ColorSidebarProvider(
        context.extensionUri,
        state,
        async (color: string) => {
            await setWorkspaceColor(color, state);
            sidebarProvider.update();
        },
        async (color: string) => {
            const nameInput = await vscode.window.showInputBox({
                prompt: '¿Quieres guardar este color como preset? (opcional)',
                placeHolder: 'Nombre del preset (deja vacío para no guardar)',
            });
    
            if (nameInput) {
                state.presets.push({
                    name: nameInput,
                    color: color
                });
                await context.globalState.update('windowBorderState', state);
            }
    
            await setWorkspaceColor(color, state);
            sidebarProvider.update();
        }
    );
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            ColorSidebarProvider.viewType,
            sidebarProvider
        )
    );

    // Comando del menú de colores
    let colorMenuCommand = vscode.commands.registerCommand('window-border.colorMenu', async () => {
        const options = [
            "📋 Seleccionar de Paleta",
            "🎨 Ingresar Color Hex",
            "💾 Guardar Color Actual como Preset",
            "📁 Gestionar Presets",
            "🕒 Colores Recientes"
        ];

        const selection = await vscode.window.showQuickPick(options, {
            placeHolder: "Selecciona una opción"
        });

        if (selection) {
            switch (selection) {
                case options[0]:
                    await showColorPalette(state);
                    break;
                case options[1]:
                    await promptHexColor();
                    break;
                case options[2]:
                    await saveCurrentAsPreset(state, context);
                    break;
                case options[3]:
                    await managePresets(state, context);
                    break;
                case options[4]:
                    await showRecentColors(state);
                    break;
            }
        }
    });

    // Comando para establecer el color
    let setBorderCommand = vscode.commands.registerCommand('window-border.setBorderColor', async () => {
        const color = await vscode.window.showInputBox({
            prompt: 'Introduce el color del borde en formato hex (ej: #FF0000)',
            placeHolder: '#RRGGBB',
            validateInput: (value) => {
                return /^#[0-9A-Fa-f]{6}$/.test(value) ? null : 'Por favor, introduce un color válido en formato hex (#RRGGBB)';
            }
        });

        if (color) {
            await setWorkspaceColor(color, state);
        }
    });

    context.subscriptions.push(colorMenuCommand, setBorderCommand);

    // Evento que se dispara cuando se abre un workspace
    context.subscriptions.push(
        vscode.workspace.onDidChangeWorkspaceFolders(async (event) => {
            for (const folder of event.added) {
                const color = await getWorkspaceColor(folder);
                if (color) {
                    await applyWindowTheme(color);
                }
            }
        })
    );

    // Aplicar color inicial
    applyInitialColor();
}

async function showColorPalette(state: any) {
    const presetItems: QuickPickItem[] = state.presets.map((preset: ColorPreset) => ({
        label: preset.name,
        description: preset.color,
        color: preset.color
    }));

    const selection = await vscode.window.showQuickPick(presetItems, {
        placeHolder: "Selecciona un color predefinido"
    });

    if (selection && selection.color) {
        await setWorkspaceColor(selection.color, state);
    }
}

async function promptHexColor() {
    return vscode.commands.executeCommand('window-border.setBorderColor');
}

async function saveCurrentAsPreset(state: any, context: vscode.ExtensionContext) {
    const currentColor = await getCurrentWorkspaceColor();
    if (!currentColor) {
        vscode.window.showErrorMessage('No hay un color actual para guardar');
        return;
    }

    const name = await vscode.window.showInputBox({
        prompt: 'Nombre para el nuevo preset',
        placeHolder: 'Ej: Mi Color Favorito'
    });

    if (name) {
        state.presets.push({ name, color: currentColor });
        await context.globalState.update('windowBorderState', state);
        vscode.window.showInformationMessage(`Preset "${name}" guardado`);
    }
}

async function managePresets(state: any, context: vscode.ExtensionContext) {
    const options = [
        "➕ Añadir Nuevo Preset",
        "🗑️ Eliminar Preset",
        "🔄 Restaurar Presets por Defecto"
    ];

    const selection = await vscode.window.showQuickPick(options, {
        placeHolder: "Gestionar Presets"
    });

    if (selection === options[0]) {
        await addNewPreset(state, context);
    } else if (selection === options[1]) {
        await deletePreset(state, context);
    } else if (selection === options[2]) {
        await resetPresets(state, context);
    }
}

async function addNewPreset(state: any, context: vscode.ExtensionContext) {
    const name = await vscode.window.showInputBox({
        prompt: 'Nombre del nuevo preset',
        placeHolder: 'Ej: Mi Color'
    });

    if (!name){
		return;
	} 

    const color = await vscode.window.showInputBox({
        prompt: 'Color (formato hex)',
        placeHolder: '#RRGGBB',
        validateInput: (value) => {
            return /^#[0-9A-Fa-f]{6}$/.test(value) ? null : 'Color hex inválido';
        }
    });

    if (color) {
        state.presets.push({ name, color });
        await context.globalState.update('windowBorderState', state);
        vscode.window.showInformationMessage(`Preset "${name}" añadido`);
    }
}


async function resetPresets(state: any, context: vscode.ExtensionContext) {
    const confirm = await vscode.window.showWarningMessage(
        '¿Estás seguro de que quieres restaurar los presets por defecto?',
        'Sí', 'No'
    );

    if (confirm === 'Sí') {
        state.presets = [...DEFAULT_PRESETS];
        await context.globalState.update('windowBorderState', state);
        vscode.window.showInformationMessage('Presets restaurados a valores por defecto');
    }
}



async function getCurrentWorkspaceColor(): Promise<string | undefined> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
        return await getWorkspaceColor(workspaceFolder);
    }
    return undefined;
}

async function deletePreset(state: any, context: vscode.ExtensionContext) {
    const presetItems: QuickPickItem[] = state.presets.map((preset: ColorPreset) => ({
        label: preset.name,
        description: preset.color,
        color: preset.color
    }));

    const selection = await vscode.window.showQuickPick(presetItems, {
        placeHolder: "Selecciona un preset para eliminar"
    });

    if (selection) {
        state.presets = state.presets.filter((p: ColorPreset) => p.name !== selection.label);
        await context.globalState.update('windowBorderState', state);
        vscode.window.showInformationMessage(`Preset "${selection.label}" eliminado`);
    }
}
async function showRecentColors(state: any) {
    if (!state.recentColors || state.recentColors.length === 0) {
        vscode.window.showInformationMessage('No hay colores recientes');
        return;
    }

    const items: QuickPickItem[] = state.recentColors.map((color: string) => ({
        label: color,
        description: 'Color reciente',
        color: color
    }));

    const selection = await vscode.window.showQuickPick(items, {
        placeHolder: "Selecciona un color reciente"
    });

    if (selection && selection.color) {
        await setWorkspaceColor(selection.color, state);
    }
}

async function setWorkspaceColor(color: string, state: any) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No hay un workspace abierto');
        return;
    }

    const vscodePath = path.join(workspaceFolder.uri.fsPath, '.vscode');
    const settingsPath = path.join(vscodePath, 'settings.json');

    if (!fs.existsSync(vscodePath)) {
        fs.mkdirSync(vscodePath, { recursive: true });
    }

    let settings: WorkspaceSettings = {};
    if (fs.existsSync(settingsPath)) {
        try {
            settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        } catch (e) {
            settings = {};
        }
    }

    settings['window-border.color'] = color;
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 4));

    // Actualizar colores recientes
    state.recentColors = state.recentColors || [];
    state.recentColors = state.recentColors.filter((c: string) => c !== color);
    state.recentColors.unshift(color);
    if (state.recentColors.length > 10) {
        state.recentColors.pop();
    }

    await applyWindowTheme(color);
}
async function getWorkspaceColor(folder: vscode.WorkspaceFolder): Promise<string | undefined> {
    const config = vscode.workspace.getConfiguration('window-border', folder.uri);
    return config.get('color');
}

async function applyWindowTheme(color: string) {
    const isLightColor = isLight(color);
    const textColor = isLightColor ? '#000000' : '#ffffff';
    
    const colorCustomizations = {
        "titleBar.activeBackground": color,
        "titleBar.activeForeground": textColor,
        "titleBar.inactiveBackground": adjustBrightness(color, -20),
        "titleBar.inactiveForeground": adjustBrightness(textColor, -20),
        "activityBar.background": color,
        "activityBar.foreground": textColor,
        "activityBar.inactiveForeground": adjustBrightness(textColor, -40),
        "statusBar.background": color,
        "statusBar.foreground": textColor
    };

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
        await vscode.workspace.getConfiguration().update(
            'workbench.colorCustomizations',
            colorCustomizations,
            vscode.ConfigurationTarget.Workspace
        );
        vscode.window.showInformationMessage(`Color del workspace actualizado a ${color}`);
    }
}

function isLight(color: string): boolean {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128;
}

function adjustBrightness(color: string, percent: number): string {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    const adjustColor = (c: number) => {
        const adjusted = Math.max(0, Math.min(255, c + (c * percent / 100)));
        return Math.round(adjusted);
    };

    const nr = adjustColor(r).toString(16).padStart(2, '0');
    const ng = adjustColor(g).toString(16).padStart(2, '0');
    const nb = adjustColor(b).toString(16).padStart(2, '0');

    return `#${nr}${ng}${nb}`;
}

async function applyInitialColor() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
        const color = await getWorkspaceColor(workspaceFolder);
        if (color) {
            await applyWindowTheme(color);
        }
    }
}



export function deactivate() {}


