# Window Border Customizer

Una extensión para Visual Studio Code que te permite personalizar el color de las ventanas de VS Code por proyecto, facilitando la identificación visual de diferentes espacios de trabajo.

## Características

- 🎨 Personaliza el color de la barra de título, barra de actividades y barra de estado
- 💾 Guarda presets de colores personalizados
- 🔄 Mantiene un historial de colores recientes
- 📱 Panel lateral con selector visual de colores
- 🌈 Ajuste automático del contraste de texto
- 🎯 Configuración por proyecto

### Vista Previa

![Ejemplo de uso](images/preview.gif)

## Instalación

Puedes instalar esta extensión de varias formas:

1. Desde el VS Code Marketplace
2. Descargando el archivo .vsix e instalando manualmente:
   ```bash
   code --install-extension window-border-0.0.1.vsix
   ```

## Uso

### Configuración Rápida
1. Abre un workspace/proyecto
2. Presiona `Ctrl+Shift+P`
3. Escribe "Window Border" y selecciona una opción:
   - "Set Color" para establecer un color directamente
   - "Color Menu" para más opciones

### Panel Lateral
1. Haz clic en el icono de color en la barra de actividad
2. Selecciona un color predefinido o añade uno nuevo
3. Los colores se guardarán automáticamente para el proyecto actual

### Presets de Color
La extensión incluye varios presets predefinidos:
- Ruby Red (#E52B50)
- Sapphire Blue (#0F52BA)
- Emerald Green (#50C878)
- Purple Amethyst (#9966CC)
- Amber Gold (#FFB200)
- Dark Mode (#1E1E1E)
- Light Mode (#FFFFFF)

## Comandos

- `window-border.colorMenu`: Abre el menú principal de colores
- `window-border.setBorderColor`: Establece el color directamente

## Configuración

Esta extensión contribuye las siguientes configuraciones:

- `window-border.color`: Color del tema para el workspace actual (formato: #RRGGBB)

## Funcionalidades por Proyecto

- Los colores se guardan por proyecto en el archivo `.vscode/settings.json`
- Los presets y colores recientes se guardan globalmente
- Al abrir un proyecto, se aplica automáticamente su color configurado

## Requisitos

- Visual Studio Code versión 1.95.0 o superior

## Problemas Conocidos

- La actualización del color requiere un reinicio de VS Code
- Algunos temas pueden interferir con la personalización del color

## Notas de la Versión

### 1.0.0
- Lanzamiento inicial
- Soporte para colores personalizados
- Panel lateral con selector de colores
- Presets predefinidos
- Historial de colores recientes

## Contribuir

1. Fork el repositorio
2. Crea una rama para tu función (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Distribuido bajo la Licencia MIT. Ver `LICENSE` para más información.

## Agradecimientos

- Inspirado en la necesidad de identificar visualmente diferentes proyectos
- Construido con TypeScript y el API de VS Code
- Iconos de VS Code y la comunidad de desarrolladores

---

**¡Disfruta personalizando tus ventanas de VS Code!**