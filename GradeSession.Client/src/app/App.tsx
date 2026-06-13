import { Button, Result } from 'antd';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { SessionsPage } from '@/pages/sessions/SessionsPage';
import { CreateSessionPage } from '@/pages/sessions/CreateSessionPage';
import { InvitesPage } from '@/pages/invites/InvitesPage';
import { InviteClaimPage } from '@/pages/invite/InviteClaimPage';
import { SessionStatusPage } from '@/pages/session-status/SessionStatusPage';
import { GradesPage } from '@/pages/grades/GradesPage';
import { ResultsPage } from '@/pages/results/ResultsPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/sessions" replace />} />

        <Route path="/sessions" element={<SessionsPage />} />
        <Route path="/sessions/new" element={<CreateSessionPage />} />
        <Route path="/sessions/:sessionId/invites" element={<InvitesPage />} />

        <Route path="/invite/:token" element={<InviteClaimPage />} />

        <Route path="/sessions/:sessionId/status" element={<SessionStatusPage />} />
        <Route
          path="/sessions/:sessionId/grades/:committeeSlotId"
          element={<GradesPage />}
        />
        <Route path="/sessions/:sessionId/results" element={<ResultsPage />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

function NotFound() {
  return (
    <Result
      status="404"
      title="Страница не найдена"
      extra={
        <Button type="primary" href="/sessions">
          К списку сессий
        </Button>
      }
    />
  );
}