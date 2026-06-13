import {
  ArrowDownOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Col,
  Grid,
  Layout,
  Progress,
  Result,
  Row,
  Slider,
  Space,
  Spin,
  Statistic,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { isAxiosError } from 'axios';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import {
  getGetApiV1SessionsSessionIdGradesSlotsCommitteeSlotIdQueryKey,
  useGetApiV1SessionsSessionIdGradesSlotsCommitteeSlotId,
  usePutApiV1SessionsSessionIdGradesSlotsCommitteeSlotIdStudentsStudentId,
} from '@/shared/api/generated/session-grades/session-grades';
import { useGetApiV1SessionsSessionId } from '@/shared/api/generated/sessions/sessions';
import {
  SessionStatus,
  StudentAssessmentPresence,
  type CommitteeSlotAssessmentsResponse,
  type CriterionResponse,
  type SaveStudentAssessmentRequest,
  type SessionResponse,
  type StudentAssessmentResponse,
  type StudentResponse,
} from '@/shared/api/generated/model';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;

type CriterionScoreMap = Record<string, number | null>;

type PageAccessProblem = 'forbidden' | 'not-found' | null;

type StudentCardProps = {
  sessionId: string;
  committeeSlotId: string;
  student: StudentResponse;
  criteria: CriterionResponse[];
  assessment?: StudentAssessmentResponse;
  finalGradeMin: number;
  finalGradeMax: number;
  isMobile: boolean,
  onAccessDenied: () => void;
  onSessionClosed: () => void;
};

type AssessmentProgress = {
  total: number;
  completed: number;
  percent: number;
};

type AssessmentOverviewRow = {
  key: string;
  studentId: string;
  shortName: string;
  fullName: string;
  presence: StudentAssessmentPresence;
  criteriaScores: CriterionScoreMap;
  finalGrade: number | null;
  completionPercent: number;
};

export function GradesPage() {
  const { sessionId, committeeSlotId } = useParams<{
    sessionId: string;
    committeeSlotId: string;
  }>();

  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [accessProblem, setAccessProblem] = useState<PageAccessProblem>(null);

  const sessionQuery = useGetApiV1SessionsSessionId(sessionId ?? '', {
    query: {
      enabled: Boolean(sessionId),
      refetchInterval: 5000,
    },
  });

  const assessmentsQuery =
    useGetApiV1SessionsSessionIdGradesSlotsCommitteeSlotId(
      sessionId ?? '',
      committeeSlotId ?? '',
      {
        query: {
          enabled: Boolean(sessionId && committeeSlotId),
          refetchInterval: 5000,
        },
      },
    );

  const session = sessionQuery.data;

  const students = session?.students ?? [];
  const criteria = session?.criteria ?? [];
  const finalGradeMin = session?.settings?.finalGradeMinScore ?? 2;
  const finalGradeMax = session?.settings?.finalGradeMaxScore ?? 5;

  const assessmentsByStudentId = useMemo(() => {
    const map = new Map<string, StudentAssessmentResponse>();

    for (const assessment of assessmentsQuery.data?.assessments ?? []) {
      if (assessment.studentId) {
        map.set(assessment.studentId, assessment);
      }
    }

    return map;
  }, [assessmentsQuery.data?.assessments]);

  const progress = useMemo(
    () =>
      calculateAssessmentProgress({
        students,
        criteria,
        assessmentsByStudentId,
      }),
    [students, criteria, assessmentsByStudentId],
  );

  const hasAccessDenied =
    accessProblem === 'forbidden' ||
    getHttpStatus(sessionQuery.error) === 403 ||
    getHttpStatus(assessmentsQuery.error) === 403;

  const isNotFound =
    accessProblem === 'not-found' ||
    getHttpStatus(sessionQuery.error) === 404 ||
    getHttpStatus(assessmentsQuery.error) === 404;

  const isLoading = sessionQuery.isLoading || assessmentsQuery.isLoading;

  const handleAccessDenied = useCallback(() => {
    setAccessProblem('forbidden');
  }, []);

  const handleSessionClosed = useCallback(() => {
    if (sessionId) {
      navigate(`/sessions/${sessionId}/results`, { replace: true });
    }
  }, [navigate, sessionId]);

  const scrollToStudent = useCallback((studentId: string) => {
    document.getElementById(getStudentCardDomId(studentId))?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, []);

  useEffect(() => {
    if (session?.status === SessionStatus.Closed && sessionId) {
      navigate(`/sessions/${sessionId}/results`, { replace: true });
    }
  }, [navigate, session?.status, sessionId]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content
        style={{
          padding: isMobile ? 16 : 24,
          maxWidth: 1120,
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
                <Text>Загружаем форму оценивания...</Text>
              </Space>
            </Card>
          )}

          {!isLoading && !hasAccessDenied && !isNotFound && (
            <>
              <AssessmentSummary progress={progress} />

              <AssessmentOverviewTable
                students={students}
                criteria={criteria}
                assessmentsByStudentId={assessmentsByStudentId}
                finalGradeMin={finalGradeMin}
                finalGradeMax={finalGradeMax}
                isMobile={isMobile}
                onScrollToStudent={scrollToStudent}
              />

              <Alert
                type="info"
                showIcon
                title="Оценки сохраняются автоматически"
              />

              <Space orientation="vertical" size={16} style={{ width: '100%' }}>
                {students.map((student) => {
                  if (!student.id || !sessionId || !committeeSlotId) {
                    return null;
                  }

                  return (
                    <div
                      key={student.id}
                      id={getStudentCardDomId(student.id)}
                      style={{ scrollMarginTop: 16 }}
                    >
                      <StudentAssessmentCard
                        sessionId={sessionId}
                        committeeSlotId={committeeSlotId}
                        student={student}
                        criteria={criteria}
                        assessment={assessmentsByStudentId.get(student.id)}
                        finalGradeMin={finalGradeMin}
                        finalGradeMax={finalGradeMax}
                        isMobile={isMobile}
                        onAccessDenied={handleAccessDenied}
                        onSessionClosed={handleSessionClosed}
                      />
                    </div>
                  );
                })}
              </Space>
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
              Оценивание студентов
            </Title>

            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              {session?.title
                ? `Сессия: ${session.title}`
                : 'Заполните оценки по критериям и итоговую оценку по каждому студенту.'}
            </Paragraph>
          </div>

          <Tag color={getSessionStatusColor(session?.status)}>
            {getSessionStatusLabel(session?.status)}
          </Tag>
        </div>
      </Space>
    </Card>
  );
}

function AssessmentSummary({ progress }: { progress: AssessmentProgress }) {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} md={12}>
        <Card style={{ height: 150 }}>
          <Statistic
            title="Общий прогресс"
            value={progress.percent}
            suffix="%"
          />

          <Progress
            percent={progress.percent}
            status={progress.percent === 100 ? 'success' : 'active'}
            style={{ marginTop: 16 }}
          />
        </Card>
      </Col>

      <Col xs={24} md={12}>
        <Card style={{ height: 150 }}>
          <Statistic
            title="Заполнено студентов"
            value={progress.completed}
            suffix={`/ ${progress.total}`}
          />
        </Card>
      </Col>
    </Row>
  );
}


function AssessmentOverviewTable({
  students,
  criteria,
  assessmentsByStudentId,
  finalGradeMin,
  finalGradeMax,
  isMobile,
  onScrollToStudent,
}: {
  students: StudentResponse[];
  criteria: CriterionResponse[];
  assessmentsByStudentId: Map<string, StudentAssessmentResponse>;
  finalGradeMin: number;
  finalGradeMax: number;
  isMobile: boolean;
  onScrollToStudent: (studentId: string) => void;
}) {
  const rows = useMemo(
    () =>
      students
        .filter((student) => Boolean(student.id))
        .map((student) => {
          const assessment = assessmentsByStudentId.get(student.id ?? '');
          const criteriaScores = buildCriterionScoreMap(criteria, assessment);
          const presence =
            assessment?.presence ?? StudentAssessmentPresence.Unknown;
          const finalGrade = assessment?.finalGrade ?? null;

          return {
            key: student.id ?? '',
            studentId: student.id ?? '',
            shortName: student.shortName ?? student.fullName ?? 'Без имени',
            fullName: student.fullName ?? 'Без имени',
            presence,
            criteriaScores,
            finalGrade,
            completionPercent: calculateStudentCompletion({
              criteria,
              criteriaScores,
              finalGrade,
              presence,
            }).percent,
          };
        }),
    [assessmentsByStudentId, criteria, students],
  );

  const columns = useMemo<TableColumnsType<AssessmentOverviewRow>>(() => {
    const criteriaColumns: TableColumnsType<AssessmentOverviewRow> = criteria
      .filter((criterion) => Boolean(criterion.id))
      .map((criterion) => ({
        title: criterion.title ?? 'Критерий',
        dataIndex: criterion.id || '',
        width: 120,
        align: 'center',
        render: (_, row) => {
          if (row.presence === StudentAssessmentPresence.NotPresent) {
            return <Tag color="warning">—</Tag>;
          }

          return (
            <ScoreBadge
              value={criterion.id ? row.criteriaScores[criterion.id] ?? null : null}
              min={criterion.minScore ?? 0}
              max={criterion.maxScore ?? 5}
            />
          );
        },
      }));

    return [
      {
        title: 'Студент',
        dataIndex: 'shortName',
        width: 150,
        fixed: isMobile ? undefined : 'left',
        render: (_, row) => (
          <Space orientation="vertical" size={2}>
            <Tooltip title="Перейти к карточке студента">
              <Button
                type="link"
                size="small"
                onClick={() => onScrollToStudent(row.studentId)}
                style={{
                  height: 'auto',
                  padding: 0,
                  whiteSpace: 'normal',
                  textAlign: 'left',
                  fontWeight: 600,
                }}
              >
                {row.shortName} <ArrowDownOutlined />
              </Button>
            </Tooltip>
          </Space>
        ),
      },
      ...criteriaColumns,
      {
        title: 'Итоговая',
        dataIndex: 'finalGrade',
        width: 120,
        align: 'center',
        render: (_, row) => {
          if (row.presence === StudentAssessmentPresence.NotPresent) {
            return <Tag color="warning">Воздерж.</Tag>;
          }

          return (
            <ScoreBadge
              value={row.finalGrade}
              min={finalGradeMin}
              max={finalGradeMax}
            />
          );
        },
      },
    ];
  }, [criteria, finalGradeMax, finalGradeMin, onScrollToStudent]);

  return (
    <Card
      title="Сводка по выставленным оценкам"
    >
      <Table
        size="small"
        rowKey="key"
        columns={columns}
        dataSource={rows}
        pagination={false}
        sticky
        scroll={{
          x: Math.max(620, 150 + criteria.length * 120 + 120 + 120),
        }}
        locale={{
          emptyText: 'Студенты не найдены.',
        }}
      />
    </Card>
  );
}

const StudentAssessmentCard = memo(function StudentAssessmentCard({
  sessionId,
  committeeSlotId,
  student,
  criteria,
  assessment,
  finalGradeMin,
  finalGradeMax,
  isMobile,
  onAccessDenied,
  onSessionClosed,
}: StudentCardProps) {
  const queryClient = useQueryClient();
  const saveAssessmentMutation =
    usePutApiV1SessionsSessionIdGradesSlotsCommitteeSlotIdStudentsStudentId();

  const [presence, setPresence] = useState<StudentAssessmentPresence>(
    assessment?.presence ?? StudentAssessmentPresence.Unknown,
  );

  const [criteriaScores, setCriteriaScores] = useState<CriterionScoreMap>(() =>
    buildCriterionScoreMap(criteria, assessment),
  );

  const [finalGrade, setFinalGrade] = useState<number | null>(
    assessment?.finalGrade ?? null,
  );

  const [lastSavedAt, setLastSavedAt] = useState<string | null>(
    assessment?.updatedAt ?? null,
  );

  const [saveError, setSaveError] = useState<string | null>(null);

  const isNotEvaluated = presence === StudentAssessmentPresence.NotPresent;

  const calculatedGrade = useMemo(
    () =>
      calculateWeightedGrade(
        criteria,
        criteriaScores,
        finalGradeMin,
        finalGradeMax,
      ),
    [criteria, criteriaScores, finalGradeMin, finalGradeMax],
  );

  const completion = useMemo(
    () =>
      calculateStudentCompletion({
        criteria,
        criteriaScores,
        finalGrade,
        presence,
      }),
    [criteria, criteriaScores, finalGrade, presence],
  );

  useEffect(() => {
    setPresence(assessment?.presence ?? StudentAssessmentPresence.Unknown);
    setCriteriaScores(buildCriterionScoreMap(criteria, assessment));
    setFinalGrade(assessment?.finalGrade ?? null);
    setLastSavedAt(assessment?.updatedAt ?? null);
    setSaveError(null);
  }, [assessment?.studentId, assessment?.updatedAt, criteria]);

  const saveAssessment = useCallback(
    async ({
      nextPresence = presence,
      nextCriteriaScores = criteriaScores,
      nextFinalGrade = finalGrade,
      successMessage,
    }: {
      nextPresence?: StudentAssessmentPresence;
      nextCriteriaScores?: CriterionScoreMap;
      nextFinalGrade?: number | null;
      successMessage?: string;
    }) => {
      if (!student.id) {
        return;
      }

      const request = buildSaveStudentAssessmentRequest({
        presence: nextPresence,
        criteria,
        criteriaScores: nextCriteriaScores,
        finalGrade: nextFinalGrade,
      });

      setSaveError(null);

      try {
        const savedAssessment = await saveAssessmentMutation.mutateAsync({
          sessionId,
          committeeSlotId,
          studentId: student.id,
          data: request,
        });

        upsertAssessmentInCache({
          queryClient,
          sessionId,
          committeeSlotId,
          assessment: savedAssessment,
        });

        setLastSavedAt(savedAssessment.updatedAt ?? new Date().toISOString());

        if (successMessage) {
          message.success(successMessage);
        }
      } catch (error) {
        const status = getHttpStatus(error);

        if (status === 403) {
          onAccessDenied();
          return;
        }

        if (status === 409) {
          onSessionClosed();
          return;
        }

        if (status === 404) {
          setSaveError('Запись не найдена. Обновите страницу.');
          return;
        }

        if (status === 400) {
          setSaveError('Сервер отклонил оценку. Проверьте диапазоны баллов.');
          return;
        }

        setSaveError('Не удалось сохранить оценку. Попробуйте ещё раз.');
      }
    },
    [
      committeeSlotId,
      criteria,
      criteriaScores,
      finalGrade,
      onAccessDenied,
      onSessionClosed,
      presence,
      queryClient,
      saveAssessmentMutation,
      sessionId,
      student.id,
    ],
  );

  const setCriterionScorePreview = useCallback(
    (criterionId: string, score: number) => {
      setPresence(StudentAssessmentPresence.Present);
      setCriteriaScores((current) => ({
        ...current,
        [criterionId]: score,
      }));
    },
    [],
  );

  const commitCriterionScore = useCallback(
    (criterionId: string, score: number) => {
      const nextPresence = StudentAssessmentPresence.Present;
      const nextCriteriaScores = {
        ...criteriaScores,
        [criterionId]: score,
      };

      setPresence(nextPresence);
      setCriteriaScores(nextCriteriaScores);

      void saveAssessment({
        nextPresence,
        nextCriteriaScores,
      });
    },
    [criteriaScores, saveAssessment],
  );

  const resetCriterionScore = useCallback(
    (criterionId: string) => {
      const nextPresence = StudentAssessmentPresence.Present;
      const nextCriteriaScores = {
        ...criteriaScores,
        [criterionId]: null,
      };

      setPresence(nextPresence);
      setCriteriaScores(nextCriteriaScores);

      void saveAssessment({
        nextPresence,
        nextCriteriaScores,
        successMessage: 'Оценка критерия сброшена.',
      });
    },
    [criteriaScores, saveAssessment],
  );

  const setFinalGradePreview = useCallback((grade: number) => {
    setPresence(StudentAssessmentPresence.Present);
    setFinalGrade(grade);
  }, []);

  const commitFinalGrade = useCallback(
    (grade: number) => {
      const nextPresence = StudentAssessmentPresence.Present;

      setPresence(nextPresence);
      setFinalGrade(grade);

      void saveAssessment({
        nextPresence,
        nextFinalGrade: grade,
      });
    },
    [saveAssessment],
  );

  const resetFinalGrade = useCallback(() => {
    const nextPresence = StudentAssessmentPresence.Present;

    setPresence(nextPresence);
    setFinalGrade(null);

    void saveAssessment({
      nextPresence,
      nextFinalGrade: null,
      successMessage: 'Итоговая оценка сброшена.',
    });
  }, [saveAssessment]);

  const applyCalculatedGrade = useCallback(() => {
    if (calculatedGrade === null) {
      return;
    }

    const nextPresence = StudentAssessmentPresence.Present;
    const nextFinalGrade = clampGrade(
      roundToStep(calculatedGrade, 0.1),
      finalGradeMin,
      finalGradeMax,
    );

    setPresence(nextPresence);
    setFinalGrade(nextFinalGrade);

    void saveAssessment({
      nextPresence,
      nextFinalGrade,
      successMessage: 'Расчётная оценка перенесена в итоговую.',
    });
  }, [calculatedGrade, finalGradeMax, finalGradeMin, saveAssessment]);

  const toggleNotEvaluated = useCallback(
    (checked: boolean) => {
      const nextPresence = checked
        ? StudentAssessmentPresence.NotPresent
        : StudentAssessmentPresence.Present;

      const nextCriteriaScores = checked
        ? createEmptyCriterionScoreMap(criteria)
        : criteriaScores;

      const nextFinalGrade = checked ? null : finalGrade;

      setPresence(nextPresence);

      if (checked) {
        setCriteriaScores(nextCriteriaScores);
        setFinalGrade(null);
      }

      void saveAssessment({
        nextPresence,
        nextCriteriaScores,
        nextFinalGrade,
        successMessage: checked
          ? 'Отмечено: студент не оценивается.'
          : 'Оценивание студента снова включено.',
      });
    },
    [criteria, criteriaScores, finalGrade, saveAssessment],
  );

  return (
    <Card
      className="sticky-title-card"
      title={
        <Space size={8}>
          <Text strong>{isMobile ? student.shortName : student.fullName ?? 'Без имени'}</Text>
          <AssessmentStatusTag
            presence={presence}
            completionPercent={completion.percent}
          />
        </Space>
      }
    >
      <Space orientation="vertical" size={14} style={{ width: '100%' }}>
        <div>
          <Text type="secondary">Тема</Text>
          <Title level={5} style={{ marginTop: 4, marginBottom: 0 }}>
            {student.topic ?? 'Тема не указана'}
          </Title>

          {student.comment && (
            <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
              {student.comment}
            </Paragraph>
          )}
        </div>

        <Row gutter={[12, 12]}>
          <Col xs={24} sm={8}>
            <CompactMetricCard
              title="Заполнение"
              value={`${completion.percent}%`}
              progress={completion.percent}
            />
          </Col>
          {!isMobile && (
            <>
              <Col xs={24} sm={8}>
                <CompactMetricCard
                  title="Расчётная"
                  value={calculatedGrade === null ? '—' : formatGrade(calculatedGrade)}
                  description="По критериям и весам"
                />
              </Col>

              <Col xs={24} sm={8}>
                <CompactMetricCard
                  title="Итоговая"
                  value={finalGrade === null ? '—' : formatGrade(finalGrade)}
                  description="Итог члена комиссии"
                />
              </Col>
            </>
          )}
        </Row>

        <Card size="small">
          <Space orientation="vertical" size={8} style={{ width: '100%' }}>
            <Space align="center" wrap>
              <Switch checked={isNotEvaluated} onChange={toggleNotEvaluated} />

              <Text strong>Воздерживаюсь от оценки</Text>
            </Space>

            <Paragraph
              type="secondary"
              ellipsis={{ rows: 1, expandable: true, symbol: 'ещё' }}
              style={{ margin: 0, fontSize: 12 }}
            >
              Если вы не присутствовали, не можете
              оценить работу или воздерживаетесь от оценки.
            </Paragraph>
          </Space>
        </Card>

        {!isNotEvaluated && (
          <>
            <CompactCriteriaList
              criteria={criteria}
              scores={criteriaScores}
              onPreviewChange={setCriterionScorePreview}
              onCommit={commitCriterionScore}
              onReset={resetCriterionScore}
            />

            <FinalGradeControl
              value={finalGrade}
              calculatedGrade={calculatedGrade}
              min={finalGradeMin}
              max={finalGradeMax}
              onPreviewChange={setFinalGradePreview}
              onCommit={commitFinalGrade}
              onReset={resetFinalGrade}
              onApplyCalculated={applyCalculatedGrade}
            />
          </>
        )}

        <SaveState
          saving={saveAssessmentMutation.isPending}
          lastSavedAt={lastSavedAt}
          error={saveError}
        />
      </Space>
    </Card>
  );
});

function CompactMetricCard({
  title,
  value,
  progress,
  description,
}: {
  title: string;
  value: string;
  progress?: number;
  description?: string;
}) {
  return (
    <Card size="small">
      <Space orientation="vertical" size={4} style={{ width: '100%' }}>
        <Text type="secondary">{title}</Text>

        <Text strong style={{ fontSize: 20 }}>
          {value}
        </Text>

        {typeof progress === 'number' && (
          <Progress
            percent={progress}
            size="small"
            showInfo={false}
            status={progress === 100 ? 'success' : 'active'}
          />
        )}

        {description && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {description}
          </Text>
        )}
      </Space>
    </Card>
  );
}

function CompactCriteriaList({
  criteria,
  scores,
  onPreviewChange,
  onCommit,
  onReset,
}: {
  criteria: CriterionResponse[];
  scores: CriterionScoreMap;
  onPreviewChange: (criterionId: string, score: number) => void;
  onCommit: (criterionId: string, score: number) => void;
  onReset: (criterionId: string) => void;
}) {
  return criteria.length > 0 &&(
    <Card size="small" title="Критерии">
      <Space orientation="vertical" size={0} style={{ width: '100%' }}>
        {criteria.map((criterion, index) => {
          if (!criterion.id) {
            return null;
          }

          return (
            <CriterionAssessmentControl
              key={criterion.id}
              criterion={criterion}
              value={scores[criterion.id] ?? null}
              isLast={index === criteria.length - 1}
              onPreviewChange={onPreviewChange}
              onCommit={onCommit}
              onReset={onReset}
            />
          );
        })}
      </Space>
    </Card>
  );
}

function CriterionAssessmentControl({
  criterion,
  value,
  isLast,
  onPreviewChange,
  onCommit,
  onReset,
}: {
  criterion: CriterionResponse;
  value: number | null;
  isLast: boolean;
  onPreviewChange: (criterionId: string, score: number) => void;
  onCommit: (criterionId: string, score: number) => void;
  onReset: (criterionId: string) => void;
}) {
  const criterionId = criterion.id ?? '';
  const min = criterion.minScore ?? 0;
  const max = criterion.maxScore ?? 5;
  const weight = criterion.weight ?? 1;

  return (
    <div
      style={{
        padding: '10px 0',
        borderBottom: isLast ? 'none' : '1px solid #f0f0f0',
      }}
    >
      <Row gutter={[12, 8]} align="middle">
        <Col xs={24} md={9}>
          <Space orientation="vertical" size={3} style={{ width: '100%' }}>
            <Space size={6} wrap>
              <Text strong>{criterion.title ?? 'Критерий'}</Text>
              <Tag>вес {formatGrade(weight)}</Tag>
              <Tag>
                {formatGrade(min)}–{formatGrade(max)}
              </Tag>
            </Space>

            {criterion.description && (
              <Paragraph
                type="secondary"
                ellipsis={{ rows: 1, expandable: true, symbol: 'ещё' }}
                style={{ margin: 0, fontSize: 12 }}
              >
                {criterion.description}
              </Paragraph>
            )}
          </Space>
        </Col>

        <Col xs={24} md={15}>
          <Space orientation="vertical" size={4} style={{ width: '100%' }}>
            <div
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
              }}
            >
              <ScoreValue value={value} min={min} max={max} />

              <Button
                size="small"
                icon={<CloseCircleOutlined />}
                disabled={value === null}
                onClick={() => onReset(criterionId)}
              >
                Сбросить
              </Button>
            </div>

            <GradeSlider
              value={value}
              min={min}
              max={max}
              step={0.1}
              onPreviewChange={(score) => onPreviewChange(criterionId, score)}
              onCommit={(score) => onCommit(criterionId, score)}
            />
          </Space>
        </Col>
      </Row>
    </div>
  );
}

function FinalGradeControl({
  value,
  calculatedGrade,
  min,
  max,
  onPreviewChange,
  onCommit,
  onReset,
  onApplyCalculated,
}: {
  value: number | null;
  calculatedGrade: number | null;
  min: number;
  max: number;
  onPreviewChange: (grade: number) => void;
  onCommit: (grade: number) => void;
  onReset: () => void;
  onApplyCalculated: () => void;
}) {
  const calculatedGradeIsAvailable = calculatedGrade !== null;

  return (
    <Card size="small" title="Итоговая оценка">
      <Space orientation="vertical" size={10} style={{ width: '100%' }}>
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
          }}
        >
          <ScoreValue value={value} min={min} max={max} />

          <Space wrap>
            <Button
              size="small"
              icon={<SaveOutlined />}
              disabled={!calculatedGradeIsAvailable}
              onClick={onApplyCalculated}
            >
              Расчётная
              {calculatedGradeIsAvailable
                ? ` (${formatGrade(
                    clampGrade(roundToStep(calculatedGrade, 0.1), min, max),
                  )})`
                : ''}
            </Button>

            <Button
              size="small"
              icon={<CloseCircleOutlined />}
              disabled={value === null}
              onClick={onReset}
            >
              Сбросить
            </Button>
          </Space>
        </div>

        <GradeSlider
          value={value}
          min={min}
          max={max}
          step={0.1}
          onPreviewChange={onPreviewChange}
          onCommit={onCommit}
        />
      </Space>
    </Card>
  );
}

function GradeSlider({
  value,
  min,
  max,
  step,
  onPreviewChange,
  onCommit,
  disabled = false,
}: {
  value: number | null;
  min: number;
  max: number;
  step: number;
  onPreviewChange: (value: number) => void;
  onCommit: (value: number) => void;
  disabled?: boolean;
}) {
  const visualValue = value ?? min;
  const isEmpty = value === null;

  return (
    <Slider
      min={min}
      max={max}
      step={step}
      value={visualValue}
      disabled={disabled}
      styles={{
        rail: {
          background: disabled
            ? '#f0f0f0'
            : 'linear-gradient(90deg, #d97a7a 0%, #e7c96b 50%, #79b88a 100%)',
          opacity: isEmpty ? 0.45 : 0.9,
        },
        track: {
          background: 'transparent',
        },
      }}
      tooltip={{
        formatter: (tooltipValue) =>
          typeof tooltipValue === 'number' ? formatGrade(tooltipValue) : '',
      }}
      onChange={(nextValue) => onPreviewChange(toSliderNumber(nextValue))}
      onChangeComplete={(nextValue) => onCommit(toSliderNumber(nextValue))}
    />
  );
}

function ScoreValue({
  value,
  min,
  max,
}: {
  value: number | null;
  min: number;
  max: number;
}) {
  if (value === null) {
    return <Tag color="default">Не выставлена</Tag>;
  }

  return <ScoreBadge value={value} min={min} max={max} />;
}

function ScoreBadge({
  value,
  min,
  max,
}: {
  value: number | null;
  min: number;
  max: number;
}) {
  if (value === null || value === undefined) {
    return <Tag color="default">—</Tag>;
  }

  const backgroundColor = getScoreColor(value, min, max);

  return (
    <Tag
      style={{
        backgroundColor,
        borderColor: backgroundColor,
        color: '#1f1f1f',
        fontWeight: 600,
        minWidth: 42,
        textAlign: 'center',
      }}
    >
      {formatGrade(value)}
    </Tag>
  );
}

function AssessmentStatusTag({
  presence,
  completionPercent,
}: {
  presence: StudentAssessmentPresence;
  completionPercent: number;
}) {
  if (presence === StudentAssessmentPresence.NotPresent) {
    return <Tag color="warning">Воздерживаюсь</Tag>;
  }

  if (completionPercent === 100) {
    return (
      <Tag color="success" icon={<CheckCircleOutlined />}>
        Заполнено
      </Tag>
    );
  }

  if (completionPercent > 0) {
    return (
      <Tag color="processing" icon={<ReloadOutlined />}>
        В процессе
      </Tag>
    );
  }

  return (
    <Tag color="default" icon={<ExclamationCircleOutlined />}>
      Не начато
    </Tag>
  );
}

function SaveState({
  saving,
  lastSavedAt,
  error,
}: {
  saving: boolean;
  lastSavedAt: string | null;
  error: string | null;
}) {
  if (error) {
    return <Alert type="error" showIcon title={error} />;
  }

  if (saving) {
    return (
      <Text type="secondary">
        <Spin size="small" /> Сохраняем...
      </Text>
    );
  }

  if (lastSavedAt) {
    return (
      <Text type="secondary">
        Последнее сохранение: {formatDateTime(lastSavedAt)}
      </Text>
    );
  }

  return <Text type="secondary">Изменений пока не было.</Text>;
}

function AccessDenied() {
  return (
    <Card>
      <Result
        status="403"
        title="Нет прав для оценивания"
        subTitle="Эта страница доступна только члену комиссии, который занял соответствующую роль по ссылке-приглашению."
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
        title="Форма оценивания не найдена"
        subTitle="Возможно, сессия, студент или роль комиссии больше не существуют."
        extra={[
          <Link key="sessions" to="/sessions">
            <Button type="primary">К сессиям оценивания</Button>
          </Link>,
        ]}
      />
    </Card>
  );
}

function buildCriterionScoreMap(
  criteria: CriterionResponse[],
  assessment?: StudentAssessmentResponse,
): CriterionScoreMap {
  const result = createEmptyCriterionScoreMap(criteria);

  for (const criterionAssessment of assessment?.criteria ?? []) {
    if (criterionAssessment.criterionId) {
      result[criterionAssessment.criterionId] =
        criterionAssessment.score ?? null;
    }
  }

  return result;
}

function createEmptyCriterionScoreMap(criteria: CriterionResponse[]) {
  const result: CriterionScoreMap = {};

  for (const criterion of criteria) {
    if (criterion.id) {
      result[criterion.id] = null;
    }
  }

  return result;
}

function buildSaveStudentAssessmentRequest({
  presence,
  criteria,
  criteriaScores,
  finalGrade,
}: {
  presence: StudentAssessmentPresence;
  criteria: CriterionResponse[];
  criteriaScores: CriterionScoreMap;
  finalGrade: number | null;
}): SaveStudentAssessmentRequest {
  if (presence === StudentAssessmentPresence.NotPresent) {
    return {
      presence,
      criteria: [],
      finalGrade: null,
    };
  }

  return {
    presence,
    criteria: criteria
      .filter((criterion) => Boolean(criterion.id))
      .map((criterion) => ({
        criterionId: criterion.id,
        score: criterion.id ? criteriaScores[criterion.id] ?? null : null,
      })),
    finalGrade,
  };
}

function calculateWeightedGrade(
  criteria: CriterionResponse[],
  criteriaScores: CriterionScoreMap,
  finalGradeMin: number,
  finalGradeMax: number,
) {
  let weightedNormalizedSum = 0;
  let weightSum = 0;

  for (const criterion of criteria) {
    if (!criterion.id) {
      continue;
    }

    const score = criteriaScores[criterion.id];

    if (score === null || score === undefined) {
      continue;
    }

    const criterionMin = criterion.minScore!;
    const criterionMax = criterion.maxScore!;
    const criterionRange = criterionMax - criterionMin;

    if (criterionRange <= 0) {
      continue;
    }

    const weight = criterion.weight ?? 1;

    if (weight <= 0) {
      continue;
    }

    const normalizedScore = (score - criterionMin) / criterionRange;

    weightedNormalizedSum += normalizedScore * weight;
    weightSum += weight;
  }

  if (weightSum <= 0) {
    return null;
  }

  const normalizedGrade = weightedNormalizedSum / weightSum;

  return finalGradeMin + normalizedGrade * (finalGradeMax - finalGradeMin);
}

function calculateStudentCompletion({
  criteria,
  criteriaScores,
  finalGrade,
  presence,
}: {
  criteria: CriterionResponse[];
  criteriaScores: CriterionScoreMap;
  finalGrade: number | null;
  presence: StudentAssessmentPresence;
}) {
  if (presence === StudentAssessmentPresence.NotPresent) {
    return {
      filled: criteria.length + 1,
      total: criteria.length + 1,
      percent: 100,
    };
  }

  const total = criteria.length + 1;
  const filledCriteria = criteria.filter(
    (criterion) =>
      criterion.id &&
      criteriaScores[criterion.id] !== null &&
      criteriaScores[criterion.id] !== undefined,
  ).length;

  const filled = filledCriteria + (finalGrade !== null ? 1 : 0);

  return {
    filled,
    total,
    percent: calculatePercent(filled, total),
  };
}

function calculateAssessmentProgress({
  students,
  criteria,
  assessmentsByStudentId,
}: {
  students: StudentResponse[];
  criteria: CriterionResponse[];
  assessmentsByStudentId: Map<string, StudentAssessmentResponse>;
}): AssessmentProgress {
  const total = students.length;

  if (total === 0) {
    return {
      total: 0,
      completed: 0,
      percent: 0,
    };
  }

  const completed = students.filter((student) => {
    if (!student.id) {
      return false;
    }

    const assessment = assessmentsByStudentId.get(student.id);
    const criteriaScores = buildCriterionScoreMap(criteria, assessment);

    return (
      calculateStudentCompletion({
        criteria,
        criteriaScores,
        finalGrade: assessment?.finalGrade ?? null,
        presence: assessment?.presence ?? StudentAssessmentPresence.Unknown,
      }).percent === 100
    );
  }).length;

  return {
    total,
    completed,
    percent: calculatePercent(completed, total),
  };
}

function upsertAssessmentInCache({
  queryClient,
  sessionId,
  committeeSlotId,
  assessment,
}: {
  queryClient: ReturnType<typeof useQueryClient>;
  sessionId: string;
  committeeSlotId: string;
  assessment: StudentAssessmentResponse;
}) {
  const queryKey =
    getGetApiV1SessionsSessionIdGradesSlotsCommitteeSlotIdQueryKey(
      sessionId,
      committeeSlotId,
    );

  queryClient.setQueryData<CommitteeSlotAssessmentsResponse>(
    queryKey,
    (current) => {
      const currentAssessments = current?.assessments ?? [];
      const index = currentAssessments.findIndex(
        (item) => item.studentId === assessment.studentId,
      );

      if (index === -1) {
        return {
          ...current,
          assessments: [...currentAssessments, assessment],
        };
      }

      return {
        ...current,
        assessments: currentAssessments.map((item, itemIndex) =>
          itemIndex === index ? assessment : item,
        ),
      };
    },
  );
}

function getStudentCardDomId(studentId: string) {
  return `student-assessment-card-${studentId}`;
}

function calculatePercent(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function toSliderNumber(value: number | number[]) {
  return Array.isArray(value) ? value[0] : value;
}

function roundToStep(value: number, step: number) {
  return Math.round(value / step) * step;
}

function clampGrade(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatGrade(value: number) {
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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

function getScoreColor(value: number, min: number, max: number) {
  const normalized = max === min ? 1 : clampGrade((value - min) / (max - min), 0, 1);

  const low = hexToRgb('#d97a7a');
  const middle = hexToRgb('#e7c96b');
  const high = hexToRgb('#79b88a');

  if (normalized <= 0.5) {
    return rgbToHex(interpolateRgb(low, middle, normalized / 0.5));
  }

  return rgbToHex(interpolateRgb(middle, high, (normalized - 0.5) / 0.5));
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '');

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function interpolateRgb(
  start: { r: number; g: number; b: number },
  end: { r: number; g: number; b: number },
  factor: number,
) {
  return {
    r: Math.round(start.r + (end.r - start.r) * factor),
    g: Math.round(start.g + (end.g - start.g) * factor),
    b: Math.round(start.b + (end.b - start.b) * factor),
  };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function toHex(value: number) {
  return value.toString(16).padStart(2, '0');
}