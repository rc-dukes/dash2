// part of https://github.com/rc-dukes/dash2 fork of https://github.com/mattbradley/dash
export default class ShareManager {
  constructor() {
    this.modal = document.getElementById('scenario-share-modal');
    this.linkDom = document.getElementById('scenario-share-link');
    this.boxDom = document.getElementById('scenario-share-box');
    this.clipboardButton = document.getElementById('scenario-share-clipboard');
    this.clipboardIcon = document.getElementById('scenario-share-clipboard-icon');
    this.clipboardSuccessIcon = document.getElementById('scenario-share-clipboard-success-icon');

    document.getElementById('scenario-share-modal-background').addEventListener('click', this._closeModal.bind(this));
    document.getElementById('scenario-share-modal-close').addEventListener('click', this._closeModal.bind(this));
    this.clipboardButton.addEventListener('click', this._copyLinkToClipboard.bind(this));

    this.linkDom.addEventListener('focus', e => this.linkDom.select());
    this.boxDom.addEventListener('focus', e => this.boxDom.select());
  }

  showModal(scenario) {
    this.modal.classList.add('is-active');

    this.clipboardIcon.classList.remove('is-hidden');
    this.clipboardSuccessIcon.classList.add('is-hidden');
    this.clipboardButton.classList.remove('is-success');
    const code = JSON.stringify(scenario);
    const bcode = btoa(code);

    const url = new URL(window.location);
    url.search = '';
    url.hash = '/s/' + encodeURIComponent(bcode);

    this.linkDom.value = url.href;
    this.boxDom.value = code;
  }

  _closeModal() {
    this.modal.classList.remove('is-active');
  }

  _copyLinkToClipboard() {
    this.linkDom.focus();
    this.linkDom.select();

    if (document.execCommand('copy', false, null)) {
      this.clipboardIcon.classList.add('is-hidden');
      this.clipboardSuccessIcon.classList.remove('is-hidden');
      this.clipboardButton.classList.add('is-success');
    }
  }
}
