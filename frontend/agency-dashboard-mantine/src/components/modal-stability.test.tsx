import { render, screen } from '@test-utils';
import { describe, expect, test } from 'vitest';
import { RecordPaymentDialog } from '../features/payments/components/record-payment-dialog.tsx';
import { ModalFormShell } from './form/modal-form-shell.tsx';

describe('Modal layout and scroll stability', () => {
  test('ModalFormShell does not inject body margin or offset styles when opened', () => {
    const beforeMargin = document.body.style.marginRight;
    const beforePadding = document.body.style.paddingRight;

    const { rerender } = render(
      <ModalFormShell opened={false} onClose={() => {}} title="Test Modal">
        <div>Modal Content</div>
      </ModalFormShell>
    );

    expect(screen.queryByText('Modal Content')).toBeNull();

    // Open modal
    rerender(
      <ModalFormShell opened onClose={() => {}} title="Test Modal">
        <div>Modal Content</div>
      </ModalFormShell>
    );

    expect(screen.getByText('Modal Content')).toBeInTheDocument();

    // Verify document body has not acquired artificial margins or padding
    expect(document.body.style.marginRight).toBe(beforeMargin);
    expect(document.body.style.paddingRight).toBe(beforePadding);

    // Verify RemoveScrollBar stylesheet was NOT injected
    const removeScrollStyles = Array.from(document.querySelectorAll('style')).filter((style) =>
      style.textContent?.includes('margin-right: ')
    );
    expect(removeScrollStyles).toHaveLength(0);

    // Close modal
    rerender(
      <ModalFormShell opened={false} onClose={() => {}} title="Test Modal">
        <div>Modal Content</div>
      </ModalFormShell>
    );

    expect(document.body.style.marginRight).toBe(beforeMargin);
    expect(document.body.style.paddingRight).toBe(beforePadding);
  });

  test('RecordPaymentDialog opens and closes without altering body geometry', () => {
    const beforeMargin = document.body.style.marginRight;

    const { rerender } = render(
      <RecordPaymentDialog
        opened={false}
        bookingCode="BKG-001"
        currency="DZD"
        remainingAmount={5000}
        submitting={false}
        onClose={() => {}}
        onSubmit={() => {}}
      />
    );

    // Open RecordPaymentDialog
    rerender(
      <RecordPaymentDialog
        opened
        bookingCode="BKG-001"
        currency="DZD"
        remainingAmount={5000}
        submitting={false}
        onClose={() => {}}
        onSubmit={() => {}}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(document.body.style.marginRight).toBe(beforeMargin);

    // Close RecordPaymentDialog
    rerender(
      <RecordPaymentDialog
        opened={false}
        bookingCode="BKG-001"
        currency="DZD"
        remainingAmount={5000}
        submitting={false}
        onClose={() => {}}
        onSubmit={() => {}}
      />
    );

    expect(document.body.style.marginRight).toBe(beforeMargin);
  });
});
