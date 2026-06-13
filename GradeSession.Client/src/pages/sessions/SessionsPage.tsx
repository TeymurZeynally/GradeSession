import { LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import { useQueries } from '@tanstack/react-query';
import {
  Button,
  Card,
  Empty,
  Flex,
  Grid,
  Layout,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { Link } from 'react-router-dom';

import {
  getApiV1SessionsSessionId,
  getGetApiV1SessionsSessionIdQueryKey,
} from '@/shared/api/generated/sessions/sessions';
import { useGetApiV1UserCurrent } from '@/shared/api/generated/user/user';
import {
  SessionParticipantRole,
  SessionStatus,
  type CommitteeSlotResponse,
  type SessionResponse,
} from '@/shared/api/generated/model';

const { Content } = Layout;
const { Title, Text } = Typography;

type SessionWithCreator = SessionResponse & {
  createdByUserId?: string | null;
};

export function SessionsPage() {
  const currentUserQuery = useGetApiV1UserCurrent();

  const userId = currentUserQuery.data?.userId;
  const sessionIds = currentUserQuery.data?.sessionIds ?? [];

  const sessionQueries = useQueries({
    queries: sessionIds.map((sessionId) => ({
      queryKey: getGetApiV1SessionsSessionIdQueryKey(sessionId),
      queryFn: ({ signal }) => getApiV1SessionsSessionId(sessionId, signal),
      enabled: Boolean(sessionId),
    })),
  });

  const isLoading =
    currentUserQuery.isLoading || sessionQueries.some((query) => query.isLoading);

  const sessions = sessionQueries
    .map((query) => query.data)
    .filter((session): session is SessionWithCreator => Boolean(session?.id));

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content
        style={{
          padding: 24,
          maxWidth: 1120,
          width: '100%',
          margin: '0 auto',
        }}
      >
        <Space orientation="vertical" size={24} style={{ width: '100%' }}>
          <PageHeader />

          {isLoading && (
            <Card>
              <Flex align="center" justify="center" gap="medium">
                <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
              </Flex>
            </Card>
          )}

          {!isLoading && sessions.length === 0 && (
            <Card>
              <Empty
                description="Вы пока не участвуете ни в одной сессии оценивания"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </Card>
          )}

          {!isLoading &&
            sessions.map((session) => (
              <SessionCard key={session.id} session={session} userId={userId} />
            ))}
        </Space>
      </Content>
    </Layout>
  );
}

function PageHeader() {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.sm;

  return (
    <Card>
      <div
        style={{
          display: 'flex',
          gap: 16,
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexDirection: isMobile ? 'column' : 'row',
        }}
      >
        <div>
          <Title level={2} style={{ marginTop: 0, marginBottom: 8 }}>
            Сессии оценивания
          </Title>

          <Text type="secondary">
            Здесь будут отображаться сессии, в которых вы участвуете как
            секретарь или член комиссии. Ваша роль появится после перехода по
            ссылке-приглашению.
          </Text>
        </div>

        <Link
          to="/sessions/new"
          style={{
            width: isMobile ? '100%' : 'auto',
            flexShrink: 0,
          }}
        >
          <Button icon={<PlusOutlined />} size="large" block={isMobile}>
            Создать
          </Button>
        </Link>
      </div>
    </Card>
  );
}

function SessionCard({
  session,
  userId,
}: {
  session: SessionWithCreator;
  userId?: string | null;
}) {
  const mySlots = getMySlots(session, userId);
  const isCreator = Boolean(userId && session.createdByUserId === userId);
  const canManageInvites = isCreator && session.status !== SessionStatus.Closed;

  return (
    <Card>
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Space
          orientation="horizontal"
          align="start"
          style={{
            width: '100%',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <Title level={4} style={{ margin: 0 }}>
              {session.title ?? 'Без названия'}
            </Title>

            <Space size={8} wrap style={{ marginTop: 8 }}>
              <Tag color={getSessionStatusColor(session.status)}>
                {getSessionStatusLabel(session.status)}
              </Tag>

              <Text type="secondary">
                Студентов: {session.students?.length ?? 0}
              </Text>

              <Text type="secondary">
                Критериев: {session.criteria?.length ?? 0}
              </Text>
            </Space>
          </div>

          {session.status === SessionStatus.Closed && session.id && (
            <Link to={`/sessions/${session.id}/results`}>
              <Button>Итоги</Button>
            </Link>
          )}
        </Space>

        <Space wrap>
          {canManageInvites && session.id && (
            <Link to={`/sessions/${session.id}/invites`}>
              <Button>Ссылки-приглашения</Button>
            </Link>
          )}

          {mySlots.map((slot) => (
            <RoleAction key={slot.id} session={session} slot={slot} />
          ))}
        </Space>
      </Space>
    </Card>
  );
}

function RoleAction({
  session,
  slot,
}: {
  session: SessionResponse;
  slot: CommitteeSlotResponse;
}) {
  if (!session.id || !slot.id || !slot.role) {
    return null;
  }

  if (slot.role === SessionParticipantRole.Secretary) {
    return (
      <Link to={`/sessions/${session.id}/status`}>
        <Button>
          Секретарь
          {slot.shortName ? `: ${slot.shortName}` : ''}
        </Button>
      </Link>
    );
  }

  if (slot.role === SessionParticipantRole.CommitteeMember) {
    return (
      <Link to={`/sessions/${session.id}/grades/${slot.id}`}>
        <Button>
          Член комиссии
          {slot.shortName ? `: ${slot.shortName}` : ''}
        </Button>
      </Link>
    );
  }

  return null;
}

function getMySlots(session: SessionResponse, userId?: string | null) {
  if (!userId) {
    return [];
  }

  return (session.committee ?? []).filter(
    (slot) => slot.claimedByUserId === userId,
  );
}

function getSessionStatusColor(status?: SessionStatus) {
  switch (status) {
    case SessionStatus.Active:
      return 'green';

    case SessionStatus.Closed:
      return 'default';

    case SessionStatus.Draft:
      return 'gold';

    default:
      return 'default';
  }
}

function getSessionStatusLabel(status?: SessionStatus) {
  switch (status) {
    case SessionStatus.Active:
      return 'Активна';

    case SessionStatus.Closed:
      return 'Закрыта';

    case SessionStatus.Draft:
      return 'Черновик';

    default:
      return 'Неизвестно';
  }
}