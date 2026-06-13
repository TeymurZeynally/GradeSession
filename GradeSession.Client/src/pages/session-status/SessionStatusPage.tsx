import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Col,
  Grid,
  Layout,
  Popconfirm,
  Progress,
  Result,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { isAxiosError } from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';

import {
  getGetApiV1SessionsSessionIdProgressQueryKey,
  getGetApiV1SessionsSessionIdQueryKey,
  useGetApiV1SessionsSessionId,
  useGetApiV1SessionsSessionIdProgress,
  usePostApiV1SessionsSessionIdClose,
} from '@/shared/api/generated/sessions/sessions';
import {
  SessionParticipantRole,
  SessionStatus,
  type CommitteeSlotProgressResponse,
  type CommitteeSlotResponse,
  type SessionProgressResponse,
  type SessionResponse,
} from '@/shared/api/generated/model';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;

type CommitteeProgressRow = {
  key: string;
  committeeSlotId: string;
  fullName: string;
  shortName: string;
  claimedByUserId?: string | null;
  totalStudents: number;
  studentsWithAnyAssessment: number;
  completedStudents: number;
  totalCriterionScores: number;
  filledCriterionScores: number;
  totalFinalGrades: number;
  filledFinalGrades: number;
  percent: number;
};

type OverallProgress = {
  membersTotal: number;
  membersClaimed: number;
  membersStarted: number;
  membersCompleted: number;
  totalStudents: number;
  criteriaCount: number;
  assessedStudents: number;
  totalStudentAssessments: number;
  completedStudents: number;
  filledCriterionScores: number;
  totalCriterionScores: number;
  filledFinalGrades: number;
  totalFinalGrades: number;
  percent: number;
};

export function SessionStatusPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const sessionQuery = useGetApiV1SessionsSessionId(sessionId ?? '', {
    query: {
      enabled: Boolean(sessionId),
    },
  });

  const progressQuery = useGetApiV1SessionsSessionIdProgress(sessionId ?? '', {
    query: {
      enabled: Boolean(sessionId),
      refetchInterval: 2000,
    },
  });

  const closeSessionMutation = usePostApiV1SessionsSessionIdClose();

  const session = sessionQuery.data;
  const progress = progressQuery.data;

  const hasAccessDenied =
    getHttpStatus(sessionQuery.error) === 403 ||
    getHttpStatus(progressQuery.error) === 403;

  const isNotFound =
    getHttpStatus(sessionQuery.error) === 404 ||
    getHttpStatus(progressQuery.error) === 404;

  const isLoading = sessionQuery.isLoading || progressQuery.isLoading;

  const rows = buildCommitteeProgressRows({
    session,
    progress,
  });

  const overallProgress = calculateOverallProgress(rows, progress);

  const closeSession = async () => {
    if (!sessionId) {
      message.error('Не удалось определить сессию.');
      return;
    }

    try {
      await closeSessionMutation.mutateAsync({ sessionId });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: getGetApiV1SessionsSessionIdQueryKey(sessionId),
        }),
        queryClient.invalidateQueries({
          queryKey: getGetApiV1SessionsSessionIdProgressQueryKey(sessionId),
        }),
      ]);

      message.success('Оценивание завершено.');
      navigate(`/sessions/${sessionId}/results`);
    } catch (error) {
      if (getHttpStatus(error) === 403) {
        message.error('Нет прав для завершения оценивания.');
        return;
      }

      if (getHttpStatus(error) === 404) {
        message.error('Сессия не найдена.');
        return;
      }

      message.error('Не удалось завершить оценивание.');
    }
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
          <PageHeader session={session} isMobile={isMobile} />

          {hasAccessDenied && <AccessDenied />}

          {isNotFound && !hasAccessDenied && <NotFound />}

          {isLoading && !hasAccessDenied && !isNotFound && (
            <Card>
              <Space align="center">
                <Spin />
                <Text>Загружаем прогресс оценивания...</Text>
              </Space>
            </Card>
          )}

          {!isLoading && !hasAccessDenied && !isNotFound && (
            <>
              <StatusAlert session={session} />

              <OverallProgressCards
                progress={overallProgress}
                sessionStatus={session?.status}
              />

              <Card title="Прогресс по членам комиссии">
                <CommitteeProgressTable rows={rows} />
              </Card>

              <Card>
                <FinishActions
                  sessionId={sessionId}
                  sessionStatus={session?.status}
                  closeLoading={closeSessionMutation.isPending}
                  onClose={closeSession}
                />
              </Card>
            </>
          )}
        </Space>
      </Content>
    </Layout>
  );
}

function PageHeader({
  session,
  isMobile,
}: {
  session?: SessionResponse;
  isMobile: boolean;
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
              Статус оценивания
            </Title>

            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              {session?.title
                ? `Сессия: ${session.title}`
                : 'Здесь секретарь видит ход оценивания по каждому члену комиссии.'}
            </Paragraph>
          </div>

          <Space wrap>
            <Tag color={getSessionStatusColor(session?.status)}>
              {getSessionStatusLabel(session?.status)}
            </Tag>
          </Space>
        </div>
      </Space>
    </Card>
  );
}

function StatusAlert({ session }: { session?: SessionResponse }) {
  if (session?.status === SessionStatus.Closed) {
    return (
      <Alert
        type="success"
        showIcon
        title="Оценивание завершено"
        description="Оценки больше нельзя изменять. Теперь можно перейти к итогам и заполнить финальные оценки после обсуждения."
      />
    );
  }

  return (
    <Alert
      type="info"
      showIcon
      title="Оценивание активно"
      description="Основной прогресс считается по студентам, по которым член комиссии уже начал оценивание или отметил, что не оценивает студента. Страница обновляет прогресс автоматически."
    />
  );
}

function OverallProgressCards({
  progress,
  sessionStatus,
}: {
  progress: OverallProgress;
  sessionStatus?: SessionStatus;
}) {
  const isClosed = sessionStatus === SessionStatus.Closed;

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} md={8}>
        <Card style={{height: 160}}>
          <Statistic
            title="Общий прогресс оценивания"
            value={progress.percent}
            suffix="%"
          />

          <Progress
            percent={progress.percent}
            status={isClosed ? 'success' : 'active'}
            style={{ marginTop: 16 }}
          />

          <Text type="secondary">
            Оценено студентов: {progress.assessedStudents} из{' '}
            {progress.totalStudentAssessments}
          </Text>
        </Card>
      </Col>

      <Col xs={24} md={8}>
        <Card style={{height: 160}}>
          <Statistic
            title="Члены комиссии"
            value={progress.membersClaimed}
            suffix={`/ ${progress.membersTotal}`}
          />

          <Text type="secondary">
            Оценили всех студентов: {progress.membersCompleted} из{' '}
            {progress.membersTotal}
          </Text>
        </Card>
      </Col>

      <Col xs={24} md={8}>
        <Card style={{height: 160}}>
          <Statistic
            title="Студенты по которым начато оценивание"
            value={progress.assessedStudents}
            suffix={`/ ${progress.totalStudentAssessments}`}
          />

          <Text type="secondary">
            Всего студентов в сессии: {progress.totalStudents}. Критериев:{' '}
            {progress.criteriaCount}.
          </Text>
        </Card>
      </Col>

      <Col xs={24} md={12}>
        <Card style={{height: 140}}>
          <Statistic
            title="Заполненные оценки по критериям"
            value={progress.filledCriterionScores}
            suffix={`/ ${progress.totalCriterionScores}`}
          />

          <Progress
            percent={calculatePercent(
              progress.filledCriterionScores,
              progress.totalCriterionScores,
            )}
            style={{ marginTop: 16 }}
          />
        </Card>
      </Col>

      <Col xs={24} md={12}>
        <Card style={{height: 140}}>
          <Statistic
            title="Заполненные итоговые оценки"
            value={progress.filledFinalGrades}
            suffix={`/ ${progress.totalFinalGrades}`}
          />

          <Progress
            percent={calculatePercent(
              progress.filledFinalGrades,
              progress.totalFinalGrades,
            )}
            style={{ marginTop: 16 }}
          />
        </Card>
      </Col>
    </Row>
  );
}

function CommitteeProgressTable({ rows }: { rows: CommitteeProgressRow[] }) {
  const columns: TableColumnsType<CommitteeProgressRow> = [
    {
      title: 'Член комиссии',
      dataIndex: 'fullName',
      width: 160,
      render: (_, row) => (
        <Space orientation="vertical" size={4}>
          <Text strong>{row.shortName || row.fullName || 'Без имени'}</Text>
        </Space>
      ),
    },
    {
      title: 'Состояние',
      dataIndex: 'status',
      width: 150,
      render: (_, row) => <MemberStatusTag row={row} />,
    },
    {
      title: 'Основной прогресс',
      dataIndex: 'percent',
      width: 240,
      render: (_, row) => (
        <Space orientation="vertical" size={4} style={{ width: '100%' }}>
          <Progress
            percent={row.percent}
            size="small"
            status={row.percent === 100 ? 'success' : 'active'}
          />

          <Text type="secondary">
            Оценено студентов: {row.studentsWithAnyAssessment} из{' '}
            {row.totalStudents}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Критерии',
      dataIndex: 'criteria',
      width: 170,
      render: (_, row) => (
        <Text>
          {row.filledCriterionScores} / {row.totalCriterionScores}
        </Text>
      ),
    },
    {
      title: 'Итоговые оценки',
      dataIndex: 'finalGrades',
      width: 170,
      render: (_, row) => (
        <Text>
          {row.filledFinalGrades} / {row.totalFinalGrades}
        </Text>
      ),
    },
  ];

  return (
    <Table
      rowKey="key"
      columns={columns}
      dataSource={rows}
      pagination={false}
      scroll={{ x: 1000 }}
      locale={{
        emptyText:
          'Члены комиссии не найдены. Проверьте состав комиссии в сессии.',
      }}
    />
  );
}

function MemberStatusTag({ row }: { row: CommitteeProgressRow }) {
  if (!row.claimedByUserId) {
    return <Tag color="default">Вход не выполнен</Tag>;
  }

  if (row.percent === 100) {
    return (
      <Tag color="green" icon={<CheckCircleOutlined />}>
        Все студенты пройдены
      </Tag>
    );
  }

  if (row.studentsWithAnyAssessment > 0) {
    return (
      <Tag color="blue" icon={<ReloadOutlined />}>
        В процессе
      </Tag>
    );
  }

  return (
    <Tag color="gold" icon={<ExclamationCircleOutlined />}>
      Не начато
    </Tag>
  );
}

function FinishActions({
  sessionId,
  sessionStatus,
  closeLoading,
  onClose,
}: {
  sessionId?: string;
  sessionStatus?: SessionStatus;
  closeLoading: boolean;
  onClose: () => void;
}) {
  if (sessionStatus === SessionStatus.Closed) {
    return (
      <Space
        orientation="vertical"
        size={12}
        style={{ width: '100%', alignItems: 'flex-start' }}
      >
        <Text strong>Оценивание уже завершено.</Text>

        <Link to={`/sessions/${sessionId}/results`}>
          <Button type="primary" icon={<TrophyOutlined />}>
            Перейти к результатам
          </Button>
        </Link>
      </Space>
    );
  }

  return (
    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
      <Alert
        type="warning"
        showIcon
        title="Перед завершением проверьте прогресс"
        description="После завершения оценивания члены комиссии не смогут изменить оценки. Откроется страница результатов, где секретарь сможет заполнить финальные оценки."
      />

      <Popconfirm
        title="Завершить оценивание?"
        description="После этого члены комиссии не смогут изменить оценки."
        okText="Завершить и перейти к результатам"
        cancelText="Отмена"
        onConfirm={onClose}
      >
        <Button
          type="primary"
          danger
          size="large"
          icon={<CloseCircleOutlined />}
          loading={closeLoading}
        >
          Завершить оценивание и перейти к результатам
        </Button>
      </Popconfirm>
    </Space>
  );
}

function AccessDenied() {
  return (
    <Card>
      <Result
        status="403"
        title="Нет прав для просмотра статуса"
        subTitle="Эта страница доступна секретарю сессии. Чтобы получить доступ, откройте ссылку-приглашение секретаря."
        extra={[
          <Link key="sessions" to="/sessions">
            <Button type="primary">К сессиям оценивания</Button>
          </Link>,
        ]}
      />
    </Card>
  );
}

function NotFound() {
  return (
    <Card>
      <Result
        status="404"
        title="Сессия не найдена"
        subTitle="Возможно, ссылка устарела или сессия была удалена."
        extra={[
          <Link key="sessions" to="/sessions">
            <Button type="primary">К сессиям оценивания</Button>
          </Link>,
        ]}
      />
    </Card>
  );
}

function buildCommitteeProgressRows({
  session,
  progress,
}: {
  session?: SessionResponse;
  progress?: SessionProgressResponse;
}): CommitteeProgressRow[] {
  const progressBySlotId = new Map(
    (progress?.committee ?? []).map((item) => [item.committeeSlotId, item]),
  );

  return (session?.committee ?? [])
    .filter((slot) => slot.role === SessionParticipantRole.CommitteeMember)
    .map((slot) => {
      const slotProgress = progressBySlotId.get(slot.id ?? '');
      return toCommitteeProgressRow(slot, slotProgress, progress);
    });
}

function toCommitteeProgressRow(
  slot: CommitteeSlotResponse,
  progress?: CommitteeSlotProgressResponse,
  sessionProgress?: SessionProgressResponse,
): CommitteeProgressRow {
  const totalStudents =
    progress?.totalStudents ?? sessionProgress?.studentsCount ?? 0;
  const totalCriterionScores =
    progress?.totalCriterionScores ??
    totalStudents * (sessionProgress?.criteriaCount ?? 0);
  const totalFinalGrades = progress?.totalFinalGrades ?? totalStudents;

  const studentsWithAnyAssessment = progress?.studentsWithAnyAssessment ?? 0;
  const filledCriterionScores = progress?.filledCriterionScores ?? 0;
  const filledFinalGrades = progress?.filledFinalGrades ?? 0;

  return {
    key: slot.id ?? createClientId(),
    committeeSlotId: slot.id ?? '',
    fullName: slot.fullName ?? '',
    shortName: slot.shortName ?? '',
    claimedByUserId: slot.claimedByUserId ?? progress?.claimedByUserId,
    totalStudents,
    studentsWithAnyAssessment,
    completedStudents: progress?.completedStudents ?? 0,
    totalCriterionScores,
    filledCriterionScores,
    totalFinalGrades,
    filledFinalGrades,
    percent: calculatePercent(studentsWithAnyAssessment, totalStudents),
  };
}

function calculateOverallProgress(
  rows: CommitteeProgressRow[],
  progress?: SessionProgressResponse,
): OverallProgress {
  const assessedStudents = sum(
    rows,
    (row) => row.studentsWithAnyAssessment,
  );
  const totalStudentAssessments = sum(rows, (row) => row.totalStudents);

  const completedStudents = sum(rows, (row) => row.completedStudents);
  const filledCriterionScores = sum(rows, (row) => row.filledCriterionScores);
  const totalCriterionScores = sum(rows, (row) => row.totalCriterionScores);
  const filledFinalGrades = sum(rows, (row) => row.filledFinalGrades);
  const totalFinalGrades = sum(rows, (row) => row.totalFinalGrades);

  return {
    membersTotal: rows.length,
    membersClaimed: rows.filter((row) => Boolean(row.claimedByUserId)).length,
    membersStarted: rows.filter((row) => row.studentsWithAnyAssessment > 0)
      .length,
    membersCompleted: rows.filter(
      (row) =>
        row.totalStudents > 0 &&
        row.studentsWithAnyAssessment >= row.totalStudents,
    ).length,
    totalStudents: progress?.studentsCount ?? 0,
    criteriaCount: progress?.criteriaCount ?? 0,
    assessedStudents,
    totalStudentAssessments,
    completedStudents,
    filledCriterionScores,
    totalCriterionScores,
    filledFinalGrades,
    totalFinalGrades,
    percent: calculatePercent(assessedStudents, totalStudentAssessments),
  };
}

function calculatePercent(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function sum<T>(items: T[], selector: (item: T) => number) {
  return items.reduce((total, item) => total + selector(item), 0);
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

function getHttpStatus(error: unknown) {
  if (!isAxiosError(error)) {
    return null;
  }

  return error.response?.status ?? null;
}

function createClientId() {
  return crypto.randomUUID();
}