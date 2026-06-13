import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Alert, Button, Card, Layout, Result, Space, Spin, Typography, message } from 'antd';
import { isAxiosError } from 'axios';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { usePostApiV1InvitesTokenClaim } from '@/shared/api/generated/invites/invites';
import { SessionParticipantRole, type ClaimInviteResponse } from '@/shared/api/generated/model';

const { Content } = Layout;
const { Text, Paragraph } = Typography;

type ClaimState =
  | {
      status: 'pending';
    }
  | {
      status: 'success';
      redirectUrl: string;
      response: ClaimInviteResponse;
    }
  | {
      status: 'error';
      title: string;
      description: string;
      resultStatus: 403 | 404 | 500 | 'error' | 'warning';
      canRetry: boolean;
    };

export function InviteClaimPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const didClaimRef = useRef(false);

  const claimInviteMutation = usePostApiV1InvitesTokenClaim();

  const [claimState, setClaimState] = useState<ClaimState>({
    status: 'pending',
  });

  const decodedToken = useMemo(() => {
    if (!token) {
      return null;
    }

    try {
      return decodeURIComponent(token);
    } catch {
      return token;
    }
  }, [token]);

  const claimInvite = async () => {
    if (!decodedToken) {
      setClaimState({
        status: 'error',
        resultStatus: 404,
        title: 'Ссылка-приглашение не найдена',
        description: 'В адресе страницы отсутствует token приглашения.',
        canRetry: false,
      });

      return;
    }

    setClaimState({ status: 'pending' });

    try {
      const response = await claimInviteMutation.mutateAsync({
        token: decodedToken,
      });

      const redirectUrl = getRedirectUrl(response);

      await queryClient.invalidateQueries();

      setClaimState({
        status: 'success',
        redirectUrl,
        response,
      });

      message.success('Роль в сессии подтверждена.');

      navigate(redirectUrl, { replace: true });
    } catch (error) {
      setClaimState(getClaimErrorState(error));
    }
  };

  useEffect(() => {
    if (didClaimRef.current) {
      return;
    }

    didClaimRef.current = true;

    void claimInvite();
  }, []);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content
        style={{
          padding: 24,
          maxWidth: 720,
          width: '100%',
          margin: '0 auto',
          display: 'grid',
          alignItems: 'center',
        }}
      >
        <Card>
          {claimState.status === 'pending' && <PendingClaim />}

          {claimState.status === 'success' && (
            <SuccessClaim
              redirectUrl={claimState.redirectUrl}
              response={claimState.response}
            />
          )}

          {claimState.status === 'error' && (
            <ErrorClaim
              title={claimState.title}
              description={claimState.description}
              resultStatus={claimState.resultStatus}
              canRetry={claimState.canRetry}
              retryLoading={claimInviteMutation.isPending}
              onRetry={claimInvite}
            />
          )}
        </Card>
      </Content>
    </Layout>
  );
}

function PendingClaim() {
  return (
    <Space orientation="vertical" size={24} align="center" style={{ width: '100%' }}>
      <Spin size="large" />

      <div style={{ textAlign: 'center' }}>
        <Text strong>Обрабатываем ссылку-приглашение</Text>

        <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
          Сейчас мы подтвердим вашу роль в сессии оценивания и перенаправим на
          нужную страницу.
        </Paragraph>
      </div>
    </Space>
  );
}

function SuccessClaim({
  redirectUrl,
  response,
}: {
  redirectUrl: string;
  response: ClaimInviteResponse;
}) {
  return (
    <Result
      status="success"
      icon={<CheckCircleOutlined />}
      title="Роль подтверждена"
      subTitle={getSuccessSubtitle(response)}
      extra={[
        <Link key="continue" to={redirectUrl} replace>
          <Button type="primary">Перейти дальше</Button>
        </Link>,
      ]}
    />
  );
}

function ErrorClaim({
  title,
  description,
  resultStatus,
  canRetry,
  retryLoading,
  onRetry,
}: {
  title: string;
  description: string;
  resultStatus: 403 | 404 | 500 | 'error' | 'warning';
  canRetry: boolean;
  retryLoading: boolean;
  onRetry: () => void;
}) {
  return (
    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
      <Result
        status={resultStatus}
        icon={resultStatus === 'error' ? <CloseCircleOutlined /> : undefined}
        title={title}
        subTitle={description}
        extra={[
          canRetry && (
            <Button
              key="retry"
              icon={<ReloadOutlined />}
              loading={retryLoading}
              onClick={onRetry}
            >
              Попробовать ещё раз
            </Button>
          ),

          <Link key="sessions" to="/sessions">
            <Button type={canRetry ? 'default' : 'primary'}>
              К сессиям оценивания
            </Button>
          </Link>,
        ]}
      />

      <Alert
        type="info"
        showIcon
        title="Что делать дальше"
        description="Если вы получили эту ссылку от секретаря или организатора, попросите отправить новую ссылку-приглашение."
      />
    </Space>
  );
}

function getRedirectUrl(response: ClaimInviteResponse) {
  if (!response.sessionId || !response.committeeSlotId || !response.role) {
    throw new Error('Claim invite response is invalid.');
  }

  if (response.role === SessionParticipantRole.Secretary) {
    return `/sessions/${response.sessionId}/status`;
  }

  if (response.role === SessionParticipantRole.CommitteeMember) {
    return `/sessions/${response.sessionId}/grades/${response.committeeSlotId}`;
  }

  return '/sessions';
}

function getSuccessSubtitle(response: ClaimInviteResponse) {
  if (response.role === SessionParticipantRole.Secretary) {
    return 'Вы вошли в сессию как секретарь. Сейчас откроется страница статуса оценивания.';
  }

  if (response.role === SessionParticipantRole.CommitteeMember) {
    return 'Вы вошли в сессию как член комиссии. Сейчас откроется страница выставления оценок.';
  }

  return 'Вы вошли в сессию оценивания.';
}

function getClaimErrorState(error: unknown): ClaimState {
  if (!isAxiosError(error)) {
    return {
      status: 'error',
      resultStatus: 500,
      title: 'Не удалось обработать ссылку',
      description: 'Произошла неизвестная ошибка. Попробуйте открыть ссылку ещё раз.',
      canRetry: true,
    };
  }

  const status = error.response?.status;

  if (status === 404) {
    return {
      status: 'error',
      resultStatus: 404,
      title: 'Ссылка-приглашение не найдена',
      description:
        'Возможно, ссылка скопирована не полностью, была создана для другой сессии или больше не существует.',
      canRetry: false,
    };
  }

  if (status === 409) {
    return {
      status: 'error',
      resultStatus: 'warning',
      title: 'Эта роль уже занята',
      description:
        'По этой ссылке уже вошёл другой пользователь. Попросите организатора выдать новую ссылку-приглашение.',
      canRetry: false,
    };
  }

  if (status === 410) {
    return {
      status: 'error',
      resultStatus: 'warning',
      title: 'Ссылка-приглашение отозвана',
      description:
        'Эта ссылка больше не действует. Обычно это происходит после перегенерации ссылок.',
      canRetry: false,
    };
  }

  if (status === 401) {
    return {
      status: 'error',
      resultStatus: 403,
      title: 'Не удалось подтвердить пользователя',
      description:
        'Попробуйте обновить страницу. Если ошибка повторится, откройте ссылку ещё раз.',
      canRetry: true,
    };
  }

  if (status === 403) {
    return {
      status: 'error',
      resultStatus: 403,
      title: 'Нет доступа',
      description: 'У текущего пользователя нет доступа к этой ссылке-приглашению.',
      canRetry: false,
    };
  }

  return {
    status: 'error',
    resultStatus: 500,
    title: 'Не удалось обработать ссылку',
    description:
      'Сервер вернул ошибку. Попробуйте ещё раз или попросите отправить новую ссылку-приглашение.',
    canRetry: true,
  };
}