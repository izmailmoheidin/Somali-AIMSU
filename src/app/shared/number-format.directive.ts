import { Directive, ElementRef, HostListener, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';

@Directive({
  selector: '[appNumberFormat]'
})
export class NumberFormatDirective implements OnInit, OnChanges {
  @Input() appNumberFormat: any;
  @Input() decimals: number = 0;

  constructor(private el: ElementRef) {}

  ngOnInit() {
    this.formatDisplay();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['appNumberFormat']) {
      if (document.activeElement !== this.el.nativeElement) {
        this.formatDisplay();
      }
    }
  }

  @HostListener('focus')
  onFocus() {
    const input = this.el.nativeElement;
    const formatted = input.value;
    if (formatted && formatted.includes(',')) {
      input.value = formatted.replace(/,/g, '');
    }
  }

  @HostListener('blur')
  onBlur() {
    this.formatDisplay();
  }

  private formatDisplay() {
    const input = this.el.nativeElement;
    let value = input.value;

    if (!value || value === '' || value === null || value === undefined) {
      return;
    }

    const rawValue = String(value).replace(/,/g, '');
    const num = parseFloat(rawValue);

    if (isNaN(num)) {
      return;
    }

    if (this.decimals > 0) {
      input.value = num.toLocaleString('en-US', {
        minimumFractionDigits: this.decimals,
        maximumFractionDigits: this.decimals
      });
    } else {
      input.value = num.toLocaleString('en-US', {
        maximumFractionDigits: 0
      });
    }
  }
}
