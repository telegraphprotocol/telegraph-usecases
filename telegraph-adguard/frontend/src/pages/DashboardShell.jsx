import { SolanaProviders } from '../solana/SolanaProviders';
import DashboardPage from './DashboardPage';

export default function DashboardShell() {
  return (
    <SolanaProviders>
      <DashboardPage />
    </SolanaProviders>
  );
}
