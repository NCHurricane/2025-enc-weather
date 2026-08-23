let dialogSequence = 0;

function resolveElement(documentRef, value) {
  return typeof value === 'string' ? documentRef?.querySelector?.(value) : value;
}

export class SatelliteFallbackDialog {
  constructor({
    mapShell,
    documentRef = globalThis.document,
    title = 'NOAA STAR satellite animation',
  } = {}) {
    this.documentRef = documentRef;
    this.mapShell = resolveElement(documentRef, mapShell);
    this.defaultTitle = title;
    this.config = null;
    this.restoreTarget = null;
    this.restoreOnClose = true;
    this.imageToken = 0;
    this.handleOpen = this.handleOpen.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleCancel = this.handleCancel.bind(this);
    this.handleBackdrop = this.handleBackdrop.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
    this.build();
  }

  build() {
    if (!this.documentRef || !this.mapShell) return;

    const sequence = ++dialogSequence;
    const titleId = `satellite-imagery-dialog-title-${sequence}`;

    this.message = this.documentRef.createElement('div');
    this.message.className = 'satellite-tile-fallback-message';
    this.message.hidden = true;
    this.message.setAttribute('role', 'status');

    this.messageText = this.documentRef.createElement('span');
    this.openButton = this.documentRef.createElement('button');
    this.openButton.type = 'button';
    this.openButton.className = 'satellite-tile-fallback-link';
    this.openButton.textContent = 'View NOAA STAR animation';
    this.openButton.setAttribute('aria-haspopup', 'dialog');
    this.openButton.addEventListener('click', this.handleOpen);
    this.message.append(this.messageText, this.openButton);
    this.mapShell.appendChild(this.message);

    this.dialog = this.documentRef.createElement('dialog');
    this.dialog.className = 'satellite-imagery-dialog';
    this.dialog.setAttribute('aria-labelledby', titleId);

    const shell = this.documentRef.createElement('div');
    shell.className = 'satellite-imagery-dialog-shell';
    const header = this.documentRef.createElement('header');
    header.className = 'satellite-imagery-dialog-header';
    this.dialogTitle = this.documentRef.createElement('h2');
    this.dialogTitle.id = titleId;
    this.dialogTitle.textContent = this.defaultTitle;

    this.closeButton = this.documentRef.createElement('button');
    this.closeButton.type = 'button';
    this.closeButton.className = 'satellite-imagery-dialog-close';
    this.closeButton.setAttribute('aria-label', 'Close satellite animation');
    this.closeButton.textContent = '×';
    this.closeButton.addEventListener('click', this.handleClose);
    header.append(this.dialogTitle, this.closeButton);

    const scroll = this.documentRef.createElement('div');
    scroll.className = 'satellite-imagery-dialog-scroll';
    this.imageStatus = this.documentRef.createElement('p');
    this.imageStatus.className = 'satellite-imagery-dialog-status';
    this.imageStatus.setAttribute('role', 'status');
    this.image = this.documentRef.createElement('img');
    this.image.className = 'satellite-imagery-dialog-image';
    this.image.hidden = true;
    scroll.append(this.imageStatus, this.image);
    shell.append(header, scroll);
    this.dialog.appendChild(shell);
    this.documentRef.body?.appendChild(this.dialog);

    this.dialog.addEventListener('cancel', this.handleCancel);
    this.dialog.addEventListener('close', this.handleClose);
    this.dialog.addEventListener('click', this.handleBackdrop);
    this.documentRef.addEventListener('keydown', this.handleKeydown);
  }

  show({
    message = 'Satellite map tiles are unavailable.',
    title = this.defaultTitle,
    animationUrl,
    alt = 'NOAA STAR satellite animation',
  } = {}) {
    if (!this.message || !animationUrl) return false;
    if (this.dialog?.open) this.close(false);
    this.config = { title, animationUrl, alt };
    this.messageText.textContent = message;
    this.message.hidden = false;
    return true;
  }

  hide() {
    this.config = null;
    if (this.message) this.message.hidden = true;
    this.close(false);
  }

  handleOpen() {
    this.open();
  }

  open() {
    if (!this.dialog || !this.config) return false;
    const token = ++this.imageToken;
    this.restoreTarget = this.documentRef.activeElement;
    this.dialogTitle.textContent = this.config.title;
    this.image.hidden = true;
    this.imageStatus.hidden = false;
    this.imageStatus.textContent = 'Loading NOAA STAR animation…';
    this.image.alt = this.config.alt;
    this.image.onload = () => {
      if (token !== this.imageToken) return;
      this.imageStatus.hidden = true;
      this.image.hidden = false;
    };
    this.image.onerror = () => {
      if (token !== this.imageToken) return;
      this.image.hidden = true;
      this.imageStatus.hidden = false;
      this.imageStatus.textContent = 'The NOAA STAR animation is currently unavailable.';
    };

    try {
      this.dialog.showModal();
    } catch {
      this.dialog.setAttribute('open', '');
    }
    this.documentRef.documentElement?.classList.add('satellite-imagery-modal-open');
    this.image.src = this.config.animationUrl;
    this.closeButton?.focus();
    return true;
  }

  handleCancel(event) {
    event.preventDefault();
    this.close();
  }

  handleBackdrop(event) {
    if (event.target === this.dialog) this.close();
  }

  handleKeydown(event) {
    if (event.key !== 'Escape' || !this.dialog?.open) return;
    event.preventDefault();
    this.close();
  }

  handleClose(event) {
    if (event?.type === 'click' && event.target === this.closeButton) {
      this.close();
      return;
    }
    this.finishClose(this.restoreOnClose);
  }

  close(restoreFocus = true) {
    if (!this.dialog) return;
    this.restoreOnClose = restoreFocus;
    if (this.dialog.open) this.dialog.close();
    else this.finishClose(restoreFocus);
  }

  finishClose(restoreFocus = true) {
    this.imageToken += 1;
    this.documentRef.documentElement?.classList.remove('satellite-imagery-modal-open');
    if (this.image) {
      this.image.onload = null;
      this.image.onerror = null;
      this.image.removeAttribute('src');
      this.image.hidden = true;
    }
    if (restoreFocus && this.restoreTarget?.isConnected) this.restoreTarget.focus?.();
    this.restoreTarget = null;
    this.restoreOnClose = true;
  }

  destroy() {
    this.hide();
    this.openButton?.removeEventListener('click', this.handleOpen);
    this.closeButton?.removeEventListener('click', this.handleClose);
    this.dialog?.removeEventListener('cancel', this.handleCancel);
    this.dialog?.removeEventListener('close', this.handleClose);
    this.dialog?.removeEventListener('click', this.handleBackdrop);
    this.documentRef?.removeEventListener('keydown', this.handleKeydown);
    this.message?.remove();
    this.dialog?.remove();
    this.message = null;
    this.dialog = null;
  }
}
