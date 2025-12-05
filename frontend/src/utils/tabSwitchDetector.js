export class TabSwitchDetector {
  constructor(onTabSwitch) {
    this.onTabSwitch = onTabSwitch;
    this.tabSwitchCount = 0;
    this.isActive = false;
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
  }

  start() {
    this.isActive = true;
    this.tabSwitchCount = 0;

    // Listen for visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    // Listen for window blur
    window.addEventListener('blur', this.handleBlur);

    // Prevent right-click
    document.addEventListener('contextmenu', this.preventRightClick);

    // Prevent F12, Ctrl+Shift+I, Ctrl+U
    document.addEventListener('keydown', this.preventDevTools);
  }

  stop() {
    this.isActive = false;

    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('blur', this.handleBlur);
    document.removeEventListener('contextmenu', this.preventRightClick);
    document.removeEventListener('keydown', this.preventDevTools);
  }

  handleVisibilityChange() {
    if (this.isActive && document.hidden) {
      this.tabSwitchCount++;
      if (this.onTabSwitch && this.isActive) {
        this.onTabSwitch(this.tabSwitchCount);
      }
    }
  }

  handleBlur() {
    if (this.isActive) {
      // Small delay to avoid false positives
      setTimeout(() => {
        if (this.isActive && document.hasFocus() === false) {
          this.tabSwitchCount++;
          if (this.onTabSwitch && this.isActive) {
            this.onTabSwitch(this.tabSwitchCount);
          }
        }
      }, 100);
    }
  }

  preventRightClick = (e) => {
    if (this.isActive) {
      e.preventDefault();
      return false;
    }
  }

  preventDevTools = (e) => {
    if (!this.isActive) return;
    
    // F12
    if (e.keyCode === 123) {
      e.preventDefault();
      return false;
    }

    // Ctrl+Shift+I
    if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
      e.preventDefault();
      return false;
    }

    // Ctrl+U
    if (e.ctrlKey && e.keyCode === 85) {
      e.preventDefault();
      return false;
    }
  }

  getCount() {
    return this.tabSwitchCount;
  }

  reset() {
    this.tabSwitchCount = 0;
  }
}