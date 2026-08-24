const wiredMaps = new WeakSet();

export function installLeafletPopupTrigger(layer, label) {
  if (!layer?.on || typeof label !== 'string' || !label.trim()) return false;

  const wireElement = () => {
    const element = layer.getElement?.();
    if (!element || element.hasAttribute('data-weather-map-popup-trigger')) return;
    element.setAttribute('data-weather-map-popup-trigger', '');
    element.setAttribute('tabindex', '0');
    element.setAttribute('role', 'button');
    element.setAttribute('aria-label', label.trim());
    element.addEventListener('keydown', (event) => {
      if (!['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      layer.openPopup?.();
    });
  };

  layer.on('add', wireElement);
  wireElement();
  return true;
}

function popupSourceElement(popup) {
  return popup?._source?.getElement?.() || null;
}

export function installLeafletPopupShell(map) {
  if (!map?.on || wiredMaps.has(map)) return false;

  map.on('popupopen', ({ popup }) => {
    const container = popup?.getElement?.();
    if (!container?.classList.contains('weather-map-popup')) return;

    const closeButton = container.querySelector('.leaflet-popup-close-button');
    if (!closeButton || closeButton.hasAttribute('data-weather-map-popup-close')) return;

    closeButton.setAttribute('data-weather-map-popup-close', '');
    const closePopup = (restoreFocus) => {
      const sourceElement = popupSourceElement(popup);
      map.closePopup(popup);
      if (restoreFocus && sourceElement?.isConnected) {
        requestAnimationFrame(() => sourceElement.focus({ preventScroll: true }));
      }
    };
    closeButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      closePopup(event.detail === 0);
    });
    closeButton.addEventListener('keydown', (event) => {
      if (!['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      closePopup(true);
    });
  });

  wiredMaps.add(map);
  return true;
}
