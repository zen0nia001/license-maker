import React from 'react';
import { href } from '../router';
import { useControl } from '../state/control';
import { useSigning } from '../state/signing';
import { Icon } from '../components/Icon';
import { Card, Empty, Msg, PageHead } from '../components/ui';
import { NeedsControl } from './app/AppPage';
import { RequestRow } from './app/Requests';

const WEEK = 7 * 24 * 3600e3;

/** Everything clients sent you, from every app: license requests now (store inquiries next). */
export const Inbox: React.FC = () => (
  <>
    <PageHead eyebrow="From your clients" title="Inbox" />
    <NeedsControl><Requests /></NeedsControl>
  </>
);

const Requests: React.FC = () => {
  const control = useControl();
  const signing = useSigning();
  const shown = control.requests.filter((r) => r.status === 'pending' || r.status === 'approved' || Date.now() - Date.parse(r.decidedAt || r.createdAt) < WEEK);
  const pending = shown.filter((r) => r.status === 'pending').length;
  return (
    <Card title="License requests" actions={<button className="small" onClick={() => void control.reload()}>Refresh</button>}>
      {pending > 0 && !signing.unlocked && <Msg tone="warn">Unlock the signing key (<a href={href.settings}>Settings</a>, or the key button) to approve requests.</Msg>}
      {shown.length === 0 ? (
        <Empty icon={<Icon name="check" size={30} />}>No requests this week. Clients send them from their app: I've paid, or Ask my provider for a free trial.</Empty>
      ) : (
        <ul className="list">{shown.map((r) => <RequestRow key={r.id} request={r} showApp />)}</ul>
      )}
    </Card>
  );
};
