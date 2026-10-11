import { PaymentsView } from '../components/payments-view.tsx';
import { RecordPaymentDialog } from '../components/record-payment-dialog.tsx';
import { usePaymentsPage } from '../hooks/use-payments-page.ts';

export function PaymentsPage() {
  const controller = usePaymentsPage();

  return (
    <>
      <PaymentsView {...controller} />
      {controller.selectedBookingCode && controller.ledger ? (
        <RecordPaymentDialog
          opened={controller.isRecordOpen}
          bookingCode={controller.selectedBookingCode}
          currency={controller.ledger.currency}
          remainingAmount={controller.ledger.remainingAmount}
          submitting={controller.isRecording}
          onClose={controller.closeRecord}
          onSubmit={controller.handleRecordPayment}
        />
      ) : null}
    </>
  );
}
