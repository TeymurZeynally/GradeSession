import {
  ArrowLeftOutlined,
  CopyOutlined,
  DownloadOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  LockOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Grid,
  Layout,
  Popconfirm,
  QRCode,
  Result,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import {
  getGetApiV1SessionsSessionIdInvitesQueryKey,
  useGetApiV1SessionsSessionIdInvites,
  usePostApiV1SessionsSessionIdInvitesIssue,
} from '@/shared/api/generated/session-invites/session-invites';
import { useGetApiV1SessionsSessionId } from '@/shared/api/generated/sessions/sessions';
import {
  SessionParticipantRole,
  type CommitteeSlotResponse,
  type InviteResponse,
  type IssuedInviteResponse,
} from '@/shared/api/generated/model';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;

type InviteRow = {
  key: string;
  committeeSlotId: string;
  role?: SessionParticipantRole;
  fullName: string;
  shortName: string;
  token?: string | null;
  link?: string | null;
  claimedByUserId?: string | null;
  claimedAt?: string | null;
  revokedAt?: string | null;
  createdAt?: string;
};

export function InvitesPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const queryClient = useQueryClient();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const didAutoIssueRef = useRef(false);

  const [issuedInvites, setIssuedInvites] = useState<IssuedInviteResponse[]>([]);
  const [visibleQrByKey, setVisibleQrByKey] = useState<Record<string, boolean>>(
    {},
  );
  const [issueAccessDenied, setIssueAccessDenied] = useState(false);

  const sessionQuery = useGetApiV1SessionsSessionId(sessionId ?? '', {
    query: {
      enabled: Boolean(sessionId),
    },
  });

  const invitesQuery = useGetApiV1SessionsSessionIdInvites(sessionId ?? '', {
    query: {
      enabled: Boolean(sessionId),
      refetchInterval: 2000,
    },
  });

  const issueInvitesMutation = usePostApiV1SessionsSessionIdInvitesIssue();

  const hasAccessDenied =
    issueAccessDenied ||
    getHttpStatus(sessionQuery.error) === 403 ||
    getHttpStatus(invitesQuery.error) === 403;

  const rows = useMemo(
    () =>
      buildInviteRows({
        committee: sessionQuery.data?.committee ?? [],
        existingInvites: invitesQuery.data ?? [],
        issuedInvites,
      }),
    [sessionQuery.data?.committee, invitesQuery.data, issuedInvites],
  );

  const canExport = rows.some((row) => row.link);
  const isLoading = sessionQuery.isLoading || invitesQuery.isLoading;

  const existingInvitesCount = invitesQuery.data?.length ?? 0;
  const committeeCount = sessionQuery.data?.committee?.length ?? 0;
  const hasIssuedLinksInCurrentPage = issuedInvites.length > 0;
  const hasExistingInvitesWithoutVisibleLinks =
    existingInvitesCount > 0 && !hasIssuedLinksInCurrentPage;

  const issueInvites = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!sessionId) {
        message.error('Не удалось определить сессию.');
        return;
      }

      setIssueAccessDenied(false);

      try {
        const response = await issueInvitesMutation.mutateAsync({ sessionId });
        const invites = response.invites ?? [];

        setIssuedInvites(invites);
        setVisibleQrByKey({});

        await queryClient.invalidateQueries({
          queryKey: getGetApiV1SessionsSessionIdInvitesQueryKey(sessionId),
        });

        if (!silent) {
          message.success(`Ссылки-приглашения сгенерированы: ${invites.length}`);
        }
      } catch (error) {
        if (getHttpStatus(error) === 403) {
          setIssueAccessDenied(true);
          return;
        }

        if (!silent) {
          message.error('Не удалось сгенерировать ссылки-приглашения.');
        }
      }
    },
    [issueInvitesMutation, queryClient, sessionId],
  );

  const shouldAutoIssueInvites =
    !hasAccessDenied &&
    Boolean(sessionId) &&
    !sessionQuery.isLoading &&
    !invitesQuery.isLoading &&
    !sessionQuery.isError &&
    !invitesQuery.isError &&
    committeeCount > 0 &&
    existingInvitesCount === 0 &&
    issuedInvites.length === 0;

  useEffect(() => {
    if (!shouldAutoIssueInvites || didAutoIssueRef.current) {
      return;
    }

    didAutoIssueRef.current = true;

    void issueInvites({ silent: true });
  }, [issueInvites, shouldAutoIssueInvites]);

  const exportCsv = () => {
    const exportRows = rows.filter((row) => row.link);

    if (exportRows.length === 0) {
      message.warning('Нет сгенерированных ссылок для экспорта.');
      return;
    }

    const csv = buildInvitesCsv(exportRows);
    const filename = `grade-session-invites-${sessionId}.csv`;

    downloadTextFile({
      filename,
      content: csv,
      mimeType: 'text/csv;charset=utf-8',
    });

    message.success('CSV-файл экспортирован.');
  };

  const toggleQr = (key: string) => {
    setVisibleQrByKey((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content
        style={{
          padding: isMobile ? 16 : 24,
          maxWidth: 1200,
          width: '100%',
          margin: '0 auto',
        }}
      >
        <Space orientation="vertical" size={24} style={{ width: '100%' }}>
          {hasAccessDenied ? (
            <AccessDenied />
          ) : (
            <>
              <PageHeader
                sessionTitle={sessionQuery.data?.title}
                isMobile={isMobile}
                regenerateDisabled={hasAccessDenied || isLoading}
                onIssue={() => issueInvites()}
                onExport={exportCsv}
                issueLoading={issueInvitesMutation.isPending}
                exportDisabled={!canExport || hasAccessDenied}
              />
              
              {shouldAutoIssueInvites || issueInvitesMutation.isPending ? (
                <Alert
                  type="info"
                  showIcon
                  title="Ссылки-приглашения создаются автоматически"
                  description="Для этой сессии ссылки ещё не выпускались, поэтому мы создаём их сразу при открытии страницы."
                />
              ) : (
                <Alert
                  type={hasExistingInvitesWithoutVisibleLinks ? 'warning' : 'info'}
                  showIcon
                  title={
                    hasExistingInvitesWithoutVisibleLinks
                      ? 'Ссылки уже выпускались раньше, но их URL недоступен после перезагрузки страницы'
                      : 'QR-коды скрыты размытием'
                  }
                  description={
                    <Space orientation="vertical" size={4}>
                      {hasExistingInvitesWithoutVisibleLinks ? (
                        <>
                          <Text>
                            Ссылки-приглашения содержат одноразовые token-части
                            URL. В открытом виде эти token не хранятся на
                            сервере, поэтому после перезагрузки страницы мы не
                            можем показать уже выпущенные URL повторно. Если
                            ссылки нужно скопировать или экспортировать заново,
                            их можно перегенерировать.
                          </Text>

                          <Text>
                            При перегенерации все старые активные ссылки будут
                            отозваны и перестанут работать. Это не повлияет на
                            пользователей, которые уже успели перейти по старым
                            ссылкам и заняли свои роли в сессии: они продолжат
                            пользоваться системой как раньше.
                          </Text>

                          <Text>
                            Новые ссылки нужно отправлять только тем людям,
                            которым действительно нужен доступ. Если другой
                            человек перейдёт по новой ссылке для уже занятой
                            роли, он сможет занять эту роль вместо прежнего
                            пользователя, и прежний пользователь потеряет доступ
                            по этой роли.
                          </Text>
                        </>
                      ) : (
                        <Text>
                          Нажмите на QR-код, чтобы временно показать его, и
                          нажмите ещё раз, чтобы скрыть.
                        </Text>
                      )}
                    </Space>
                  }
                />
              )}

              {isLoading && (
                <Card>
                  <Spin />{' '}
                  <Text style={{ marginLeft: 12 }}>Загружаем данные...</Text>
                </Card>
              )}

              {!isLoading && (
                <Card title="Ссылки-приглашения">
                  <InvitesTable
                    rows={rows}
                    visibleQrByKey={visibleQrByKey}
                    onToggleQr={toggleQr}
                  />
                </Card>
              )}
            </>
          )}
        </Space>
      </Content>
    </Layout>
  );
}

function AccessDenied() {
  return (
    <Card>
      <Result
        status="403"
        icon={<LockOutlined />}
        title="Нет прав для управления ссылками"
        subTitle="Эта страница доступна только создателю сессии. Если вам нужно участвовать в оценивании, откройте свою ссылку-приглашение или перейдите к списку сессий оценивания."
        extra={[
          <Link key="sessions" to="/sessions">
            <Button type="primary">К сессиям оценивания</Button>
          </Link>,
        ]}
      />
    </Card>
  );
}

function PageHeader({
  sessionTitle,
  isMobile,
  issueLoading,
  exportDisabled,
  regenerateDisabled,
  onIssue,
  onExport,
}: {
  sessionTitle?: string | null;
  isMobile: boolean;
  issueLoading: boolean;
  exportDisabled: boolean;
  regenerateDisabled: boolean;
  onIssue: () => void;
  onExport: () => void;
}) {
  return (
    <Card>
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Link to="/sessions">
          <Button icon={<ArrowLeftOutlined />}>К сессиям</Button>
        </Link>

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
              Ссылки-приглашения
            </Title>

            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              {sessionTitle
                ? `Сессия: ${sessionTitle}`
                : 'Здесь можно выпустить ссылки для секретаря и членов комиссии.'}
            </Paragraph>
          </div>

          <Space
            orientation={isMobile ? 'vertical' : 'horizontal'}
            style={{ width: isMobile ? '100%' : undefined }}
          >
            <Button
              icon={<DownloadOutlined />}
              disabled={exportDisabled}
              block={isMobile}
              onClick={onExport}
            >
              Экспорт CSV
            </Button>

            <Popconfirm
              title="Перегенерировать все ссылки?"
              description="Переход по старым ссылкам перестанет работать."
              okText="Перегенерировать"
              cancelText="Отмена"
              onConfirm={onIssue}
            >
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                disabled={regenerateDisabled}
                loading={issueLoading}
                block={isMobile}
              >
                Перегенерировать
              </Button>
            </Popconfirm>
          </Space>
        </div>
      </Space>
    </Card>
  );
}

function InvitesTable({
  rows,
  visibleQrByKey,
  onToggleQr,
}: {
  rows: InviteRow[];
  visibleQrByKey: Record<string, boolean>;
  onToggleQr: (key: string) => void;
}) {
  const columns: TableColumnsType<InviteRow> = [
    {
      title: 'Роль',
      dataIndex: 'role',
      width: 90,
      render: (_, row) => (
        <Space orientation="vertical" size={4}>
          <Tag color={getRoleColor(row.role)}>{getRoleLabel(row.role)}</Tag>
        </Space>
      ),
    },
    {
      title: 'ФИО',
      dataIndex: 'fullName',
      width: 260,
      render: (_, row) => row.fullName || '—',
    },
    {
      title: 'Состояние',
      dataIndex: 'status',
      width: 100,
      render: (_, row) => <InviteStatusTag row={row} />,
    },
    {
      title: 'Ссылка',
      dataIndex: 'link',
      width: 200,
      render: (_, row) =>
        row.link ? (
          <Space orientation="vertical" size={8} style={{ width: '100%' }}>
            <Button
              icon={<CopyOutlined />}
              onClick={() => copyToClipboard(row.link)}
            >
              Копировать ссылку
            </Button>
          </Space>
        ) : (
          <Text type="secondary">Ссылка недоступна.</Text>
        ),
    },
    {
      title: 'QR',
      dataIndex: 'qr',
      width: 190,
      render: (_, row) =>
        row.link ? (
          <QrInvitePreview
            value={row.link}
            visible={Boolean(visibleQrByKey[row.key])}
            onToggle={() => onToggleQr(row.key)}
          />
        ) : (
          <Text type="secondary">Нет QR</Text>
        ),
    },
  ];

  return (
    <Table
      rowKey="key"
      dataSource={rows}
      columns={columns}
      pagination={false}
      scroll={{ x: 1000 }}
      locale={{
        emptyText:
          'Участники комиссии не найдены. Проверьте, что сессия была создана с составом комиссии.',
      }}
    />
  );
}

function QrInvitePreview({
  value,
  visible,
  onToggle,
}: {
  value: string;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={visible ? 'Скрыть QR-код' : 'Показать QR-код'}
      style={{
        border: 'none',
        background: 'transparent',
        padding: 0,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <Space orientation="vertical" size={8} align="center">
        <div
          style={{
            position: 'relative',
            width: 128,
            height: 128,
          }}
        >
          <div
            style={{
              filter: visible ? 'none' : 'blur(9px)',
              transition: 'filter 160ms ease',
            }}
          >
            <QRCode value={value} size={128} bordered />
          </div>

          {!visible && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                placeItems: 'center',
                pointerEvents: 'none',
              }}
            >
              <Tag icon={<EyeOutlined />}>Показать</Tag>
            </div>
          )}
        </div>

        <div style={{width: 160 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {visible ? (
              <>
                <EyeInvisibleOutlined /> Нажмите, чтобы скрыть
              </>
            ) : (
              <>
                <EyeOutlined /> Нажмите, чтобы показать
              </>
            )}
          </Text>
        </div>
      </Space>
    </button>
  );
}

function InviteStatusTag({ row }: { row: InviteRow }) {
  if (row.revokedAt) {
    return <Tag color="default">Отозвана</Tag>;
  }

  if (row.claimedByUserId) {
    return <Tag color="blue">Использована</Tag>;
  }

  if (row.link || row.createdAt) {
    return <Tag color="green">Активна</Tag>;
  }

  return <Tag color="gold">Не выпущена</Tag>;
}

function buildInviteRows({
  committee,
  existingInvites,
  issuedInvites,
}: {
  committee: CommitteeSlotResponse[];
  existingInvites: InviteResponse[];
  issuedInvites: IssuedInviteResponse[];
}): InviteRow[] {
  const existingByCommitteeSlotId = new Map(
    existingInvites.map((invite) => [invite.committeeSlotId, invite]),
  );

  const issuedByCommitteeSlotId = new Map(
    issuedInvites.map((invite) => [invite.committeeSlotId, invite]),
  );

  return committee.map((member) => {
    const existingInvite = existingByCommitteeSlotId.get(member.id ?? '');
    const issuedInvite = issuedByCommitteeSlotId.get(member.id ?? '');
    const token = issuedInvite?.token;
    const link = token ? buildInviteLink(token) : null;

    return {
      key: member.id ?? issuedInvite?.inviteId ?? createClientId(),
      committeeSlotId: member.id ?? '',
      role: member.role ?? issuedInvite?.role ?? existingInvite?.role,
      fullName: member.fullName ?? issuedInvite?.fullName ?? '',
      shortName: member.shortName ?? issuedInvite?.shortName ?? '',
      token,
      link,
      claimedByUserId: existingInvite?.claimedByUserId,
      claimedAt: existingInvite?.claimedAt,
      revokedAt: existingInvite?.revokedAt,
      createdAt: existingInvite?.createdAt,
    };
  });
}

function buildInviteLink(token: string) {
  return `${window.location.origin}/invite/${encodeURIComponent(token)}`;
}

async function copyToClipboard(value?: string | null) {
  if (!value) {
    message.warning('Ссылка недоступна.');
    return;
  }

  try {
    await navigator.clipboard.writeText(value);
    message.success('Ссылка скопирована.');
  } catch {
    message.error('Не удалось скопировать ссылку.');
  }
}

function buildInvitesCsv(rows: InviteRow[]) {
  const header = ['Роль', 'ФИО', 'Краткое имя', 'Ссылка'];

  const csvRows = rows.map((row) => [
    getRoleLabel(row.role),
    row.fullName,
    row.shortName,
    row.link ?? '',
  ]);

  return [header, ...csvRows]
    .map((row) => row.map(escapeCsvCell).join(';'))
    .join('\n');
}

function escapeCsvCell(value: string) {
  const escaped = value.replace(/"/g, '""');

  return `"${escaped}"`;
}

function downloadTextFile({
  filename,
  content,
  mimeType,
}: {
  filename: string;
  content: string;
  mimeType: string;
}) {
  const blob = new Blob([`\uFEFF${content}`], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

function getRoleLabel(role?: SessionParticipantRole) {
  switch (role) {
    case SessionParticipantRole.Secretary:
      return 'Секретарь';

    case SessionParticipantRole.CommitteeMember:
      return 'Член комиссии';

    default:
      return 'Не указана';
  }
}

function getRoleColor(role?: SessionParticipantRole) {
  switch (role) {
    case SessionParticipantRole.Secretary:
      return 'purple';

    case SessionParticipantRole.CommitteeMember:
      return 'cyan';

    default:
      return 'default';
  }
}

function getHttpStatus(error: unknown) {
  if (!isAxiosError(error)) {
    return null;
  }

  return error.response?.status ?? null;
}

function createClientId() {
  return crypto.randomUUID();
}