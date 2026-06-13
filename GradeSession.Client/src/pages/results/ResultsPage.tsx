import { ArrowLeftOutlined, DownloadOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Grid,
  InputNumber,
  Layout,
  Result,
  Segmented,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { isAxiosError } from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  getGetApiV1SessionsSessionIdFinalResultsQueryKey,
  useGetApiV1SessionsSessionIdFinalResults,
  usePutApiV1SessionsSessionIdFinalResults,
} from '@/shared/api/generated/session-final-results/session-final-results';
import { useGetApiV1SessionsSessionIdAssessmentSummary } from '@/shared/api/generated/session-assessment-summary/session-assessment-summary';
import { useGetApiV1SessionsSessionId } from '@/shared/api/generated/sessions/sessions';
import { useGetApiV1UserCurrent } from '@/shared/api/generated/user/user';
import {
  SessionParticipantRole,
  SessionStatus,
  StudentAssessmentPresence,
  type AssessmentSummaryResponse,
  type CommitteeSlotResponse,
  type CriterionResponse,
  type FinalResultsResponse,
  type FinalStudentResultResponse,
  type SaveFinalResultsRequest,
  type SessionResponse,
  type StudentAssessmentSummaryResponse,
  type StudentResponse,
} from '@/shared/api/generated/model';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;

type ResultsRow = {
  key: string;
  studentId: string;
  shortName: string;
  fullName: string;
  topic: string;
};

type PageAccessProblem = 'forbidden' | 'not-found' | 'not-closed' | null;

type ResultsTableMode = 'full' | 'short';

type SaveDiscussionGrade = (
  studentId: string,
  finalGrade: number | null,
) => Promise<void>;

export function ResultsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const queryClient = useQueryClient();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [accessProblem, setAccessProblem] = useState<PageAccessProblem>(null);

  const currentUserQuery = useGetApiV1UserCurrent();

  const sessionQuery = useGetApiV1SessionsSessionId(sessionId ?? '', {
    query: {
      enabled: Boolean(sessionId),
      refetchInterval: 5000,
    },
  });

  const assessmentSummaryQuery = useGetApiV1SessionsSessionIdAssessmentSummary(
    sessionId ?? '',
    {
      query: {
        enabled: Boolean(sessionId),
      },
    },
  );

  const session = sessionQuery.data;
  const currentUserId = currentUserQuery.data?.userId ?? null;

  const isSecretary = useMemo(
    () =>
      Boolean(
        currentUserId &&
          session?.committee?.some(
            (slot) =>
              slot.role === SessionParticipantRole.Secretary &&
              slot.claimedByUserId === currentUserId,
          ),
      ),
    [currentUserId, session?.committee],
  );

  const finalResultsQuery = useGetApiV1SessionsSessionIdFinalResults(
    sessionId ?? '',
    {
      query: {
        enabled: Boolean(sessionId),
        refetchInterval: isSecretary ? 10000 : 2000,
      },
    },
  );

  const saveFinalResultsMutation = usePutApiV1SessionsSessionIdFinalResults();

  const students = session?.students ?? [];
  const criteria = session?.criteria ?? [];
  const committeeMembers = useMemo(
    () =>
      (session?.committee ?? []).filter(
        (slot) => slot.role === SessionParticipantRole.CommitteeMember,
      ),
    [session?.committee],
  );

  const finalGradeMin = session?.settings?.finalGradeMinScore ?? 2;
  const finalGradeMax = session?.settings?.finalGradeMaxScore ?? 5;

  const assessmentsBySlotAndStudent = useMemo(
    () => buildAssessmentIndex(assessmentSummaryQuery.data),
    [assessmentSummaryQuery.data],
  );

  const finalResultsByStudentId = useMemo(
    () => buildFinalResultsIndex(finalResultsQuery.data),
    [finalResultsQuery.data],
  );

  const rows = useMemo(
    () =>
      students
        .filter((student) => Boolean(student.id))
        .map((student) => ({
          key: student.id ?? '',
          studentId: student.id ?? '',
          shortName: student.shortName ?? student.fullName ?? 'Без имени',
          fullName: student.fullName ?? 'Без имени',
          topic: student.topic ?? '',
        })),
    [students],
  );

  const hasAccessDenied =
    accessProblem === 'forbidden' ||
    getHttpStatus(sessionQuery.error) === 403 ||
    getHttpStatus(assessmentSummaryQuery.error) === 403 ||
    getHttpStatus(finalResultsQuery.error) === 403;

  const isNotFound =
    accessProblem === 'not-found' ||
    getHttpStatus(sessionQuery.error) === 404 ||
    getHttpStatus(assessmentSummaryQuery.error) === 404 ||
    getHttpStatus(finalResultsQuery.error) === 404;

  const isNotClosed =
    accessProblem === 'not-closed' ||
    session?.status === SessionStatus.Active ||
    session?.status === SessionStatus.Draft ||
    getHttpStatus(assessmentSummaryQuery.error) === 409 ||
    getHttpStatus(finalResultsQuery.error) === 409;

  const isLoading =
    sessionQuery.isLoading ||
    assessmentSummaryQuery.isLoading ||
    finalResultsQuery.isLoading ||
    currentUserQuery.isLoading;

  const canExport = rows.length > 0;

  const saveDiscussionGrade = useCallback<SaveDiscussionGrade>(
    async (studentId, finalGrade) => {
      if (!sessionId) {
        message.error('Не удалось определить сессию.');
        return;
      }

      const request = buildSaveFinalResultsRequest({
        students,
        finalResultsByStudentId,
        changedStudentId: studentId,
        nextFinalGrade: finalGrade,
      });

      try {
        const response = await saveFinalResultsMutation.mutateAsync({
          sessionId,
          data: request,
        });

        queryClient.setQueryData<FinalResultsResponse>(
          getGetApiV1SessionsSessionIdFinalResultsQueryKey(sessionId),
          response,
        );
      } catch (error) {
        const status = getHttpStatus(error);

        if (status === 403) {
          message.error('Нет прав для изменения финальных оценок.');
          setAccessProblem('forbidden');
          throw error;
        }

        if (status === 404) {
          message.error('Сессия или результат не найдены.');
          setAccessProblem('not-found');
          throw error;
        }

        if (status === 409) {
          message.error(
            'Финальные оценки можно менять только после завершения оценивания.',
          );
          setAccessProblem('not-closed');
          throw error;
        }

        if (status === 400) {
          message.error('Сервер отклонил финальную оценку. Проверьте диапазон.');
          throw error;
        }

        message.error('Не удалось сохранить финальную оценку.');
        throw error;
      }
    },
    [
      finalResultsByStudentId,
      queryClient,
      saveFinalResultsMutation,
      sessionId,
      students,
    ],
  );

  const exportCsv = () => {
    const csv = buildResultsCsv({
      rows,
      criteria,
      committeeMembers,
      assessmentsBySlotAndStudent,
      finalResultsByStudentId,
      finalGradeMin,
      finalGradeMax,
    });

    downloadTextFile({
      filename: `grade-session-results-${sessionId}.csv`,
      content: csv,
      mimeType: 'text/csv;charset=utf-8',
    });

    message.success('CSV-файл экспортирован.');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content
        style={{
          padding: isMobile ? 16 : 24,
          maxWidth: isMobile ? 1120 : 'none',
          width: '100%',
          margin: isMobile ? '0 auto' : 0,
        }}
      >
        <Space orientation="vertical" size={24} style={{ width: '100%' }}>
          <PageHeader
            session={session}
            isMobile={isMobile}
            canExport={canExport}
            onExport={exportCsv}
          />

          {hasAccessDenied && <AccessDenied />}

          {isNotFound && !hasAccessDenied && <NotFound />}

          {isNotClosed && !hasAccessDenied && !isNotFound && (
            <SessionNotClosed />
          )}

          {isLoading && !hasAccessDenied && !isNotFound && !isNotClosed && (
            <Card>
              <Space align="center">
                <Spin />
                <Text>Загружаем результаты...</Text>
              </Space>
            </Card>
          )}

          {!isLoading && !hasAccessDenied && !isNotFound && !isNotClosed && (
            <>
              <SummaryAlert isSecretary={isSecretary} />

              <ResultsTable
                rows={rows}
                criteria={criteria}
                committeeMembers={committeeMembers}
                assessmentsBySlotAndStudent={assessmentsBySlotAndStudent}
                finalResultsByStudentId={finalResultsByStudentId}
                finalGradeMin={finalGradeMin}
                finalGradeMax={finalGradeMax}
                canEditDiscussionGrades={isSecretary}
                onSaveDiscussionGrade={saveDiscussionGrade}
              />
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
  canExport,
  onExport,
}: {
  session?: SessionResponse;
  isMobile: boolean;
  canExport: boolean;
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
              Результаты оценивания
            </Title>

            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              {session?.title
                ? `Сессия: ${session.title}`
                : 'Итоговая таблица оценок членов комиссии и финальные оценки после обсуждения.'}
            </Paragraph>
          </div>

          <Space wrap style={{ width: isMobile ? '100%' : undefined }}>
            <Tag color={getSessionStatusColor(session?.status)}>
              {getSessionStatusLabel(session?.status)}
            </Tag>

            <Button
              icon={<DownloadOutlined />}
              disabled={!canExport}
              block={isMobile}
              onClick={onExport}
            >
              Скачать CSV
            </Button>
          </Space>
        </div>
      </Space>
    </Card>
  );
}

function SummaryAlert({ isSecretary }: { isSecretary: boolean }) {
  if (isSecretary) {
    return (
      <Alert
        type="info"
        showIcon
        message="Финальные оценки после обсуждения сохраняются автоматически"
        description="Измените значение в колонке оценки по итогам обсуждения. Сохранение произойдёт после ухода из поля."
      />
    );
  }

  return (
    <Alert
      type="info"
      showIcon
      message="Финальные оценки обновляются автоматически"
      description="Оценки в ходе обсуждения может изменять секретарь. Для остальных участников таблица доступна в режиме просмотра. Данные обновляются автоматически."
    />
  );
}

function ResultsTable({
  rows,
  criteria,
  committeeMembers,
  assessmentsBySlotAndStudent,
  finalResultsByStudentId,
  finalGradeMin,
  finalGradeMax,
  canEditDiscussionGrades,
  onSaveDiscussionGrade,
}: {
  rows: ResultsRow[];
  criteria: CriterionResponse[];
  committeeMembers: CommitteeSlotResponse[];
  assessmentsBySlotAndStudent: Map<string, StudentAssessmentSummaryResponse>;
  finalResultsByStudentId: Map<string, FinalStudentResultResponse>;
  finalGradeMin: number;
  finalGradeMax: number;
  canEditDiscussionGrades: boolean;
  onSaveDiscussionGrade: SaveDiscussionGrade;
}) {
  const [tableMode, setTableMode] = useState<ResultsTableMode>('full');

  const fullColumns = useMemo<TableColumnsType<ResultsRow>>(() => {
    const committeeColumns: TableColumnsType<ResultsRow> = committeeMembers.map(
      (member) => ({
        title: member.shortName || member.fullName || 'Член комиссии',
        key: `member-${member.id}`,
        align: 'center' as const,
        children: [
          ...criteria
            .filter((criterion) => Boolean(criterion.id))
            .map((criterion) => ({
              title: criterion.title ?? 'Критерий',
              key: `member-${member.id}-criterion-${criterion.id}`,
              width: 112,
              align: 'center' as const,
              render: (_: unknown, row: ResultsRow) => {
                const assessment = getAssessment({
                  assessmentsBySlotAndStudent,
                  committeeSlotId: member.id,
                  studentId: row.studentId,
                });

                if (
                  assessment?.presence === StudentAssessmentPresence.NotPresent
                ) {
                  return <Tag color="warning">Воздерж.</Tag>;
                }

                const value = getCriterionScore(assessment, criterion.id);

                return (
                  <ScoreBadge
                    value={value}
                    min={criterion.minScore ?? 0}
                    max={criterion.maxScore ?? 5}
                  />
                );
              },
            })),
          {
            title: 'Итоговая',
            key: `member-${member.id}-final`,
            width: 112,
            align: 'center' as const,
            render: (_: unknown, row: ResultsRow) => {
              const assessment = getAssessment({
                assessmentsBySlotAndStudent,
                committeeSlotId: member.id,
                studentId: row.studentId,
              });

              if (
                assessment?.presence === StudentAssessmentPresence.NotPresent
              ) {
                return <Tag color="warning">Воздерж.</Tag>;
              }

              return (
                <ScoreBadge
                  value={assessment?.finalGrade ?? null}
                  min={finalGradeMin}
                  max={finalGradeMax}
                />
              );
            },
          },
        ],
      }),
    );

    const averageColumns: TableColumnsType<ResultsRow> = [
      {
        title: 'Среднее',
        key: 'average',
        align: 'center' as const,
        children: [
          ...criteria
            .filter((criterion) => Boolean(criterion.id))
            .map((criterion) => ({
              title: criterion.title ?? 'Критерий',
              key: `average-criterion-${criterion.id}`,
              width: 112,
              align: 'center' as const,
              render: (_: unknown, row: ResultsRow) => {
                const average = calculateAverageCriterionScore({
                  committeeMembers,
                  assessmentsBySlotAndStudent,
                  studentId: row.studentId,
                  criterionId: criterion.id,
                });

                return (
                  <ScoreBadge
                    value={average}
                    min={criterion.minScore ?? 0}
                    max={criterion.maxScore ?? 5}
                  />
                );
              },
            })),
          {
            title: 'Итоговая',
            key: 'average-final',
            width: 112,
            align: 'center' as const,
            render: (_: unknown, row: ResultsRow) => {
              const average = calculateAverageFinalGrade({
                committeeMembers,
                assessmentsBySlotAndStudent,
                studentId: row.studentId,
              });

              return (
                <ScoreBadge
                  value={average}
                  min={finalGradeMin}
                  max={finalGradeMax}
                />
              );
            },
          },
        ],
      },
    ];

    return [
      {
        title: 'Студент',
        dataIndex: 'shortName',
        key: 'student',
        width: 170,
        fixed: 'left',
        render: (_: unknown, row: ResultsRow) => (
          <Space orientation="vertical" size={2}>
            <Text strong>{row.shortName}</Text>
            {row.topic && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {row.topic}
              </Text>
            )}
          </Space>
        ),
      },
      ...committeeColumns,
      ...averageColumns,
      {
        title: 'Оценка по итогам обсуждения',
        key: 'discussion-final-grade',
        width: canEditDiscussionGrades ? 150 : 120,
        fixed: 'right',
        align: 'center',
        render: (_: unknown, row: ResultsRow) => {
          const result = finalResultsByStudentId.get(row.studentId);
          const value = result?.finalGrade ?? null;

          if (!canEditDiscussionGrades) {
            return (
              <ScoreBadge
                value={value}
                min={finalGradeMin}
                max={finalGradeMax}
              />
            );
          }

          return (
            <DiscussionFinalGradeInput
              studentId={row.studentId}
              value={value}
              min={finalGradeMin}
              max={finalGradeMax}
              onSave={onSaveDiscussionGrade}
            />
          );
        },
      },
    ];
  }, [
    assessmentsBySlotAndStudent,
    canEditDiscussionGrades,
    committeeMembers,
    criteria,
    finalGradeMax,
    finalGradeMin,
    finalResultsByStudentId,
    onSaveDiscussionGrade,
  ]);

  const shortColumns = useMemo<TableColumnsType<ResultsRow>>(
    () => [
      {
        title: 'ФИО',
        dataIndex: 'fullName',
        key: 'fullName',
        render: (_: unknown, row: ResultsRow) => (
          <Text strong>{row.fullName}</Text>
        ),
      },
      {
        title: 'Оценка по итогам обсуждения',
        key: 'discussion-final-grade',
        align: 'center',
        render: (_: unknown, row: ResultsRow) => {
          const result = finalResultsByStudentId.get(row.studentId);
          const value = result?.finalGrade ?? null;

          if (!canEditDiscussionGrades) {
            return (
              <ScoreBadge
                value={value}
                min={finalGradeMin}
                max={finalGradeMax}
              />
            );
          }

          return (
            <DiscussionFinalGradeInput
              studentId={row.studentId}
              value={value}
              min={finalGradeMin}
              max={finalGradeMax}
              onSave={onSaveDiscussionGrade}
            />
          );
        },
      },
    ],
    [
      canEditDiscussionGrades,
      finalGradeMax,
      finalGradeMin,
      finalResultsByStudentId,
      onSaveDiscussionGrade,
    ],
  );

  const fullScrollX = Math.max(
    900,
    170 +
      committeeMembers.length * (criteria.length * 112 + 112) +
      criteria.length * 112 +
      112 +
      (canEditDiscussionGrades ? 150 : 120),
  );

  const columns = tableMode === 'short' ? shortColumns : fullColumns;

  return (
    <Card
      title="Итоговая таблица"
      extra={
        <Segmented
          value={tableMode}
          options={[
            {
              label: 'Подробно',
              value: 'full',
            },
            {
              label: 'Кратко',
              value: 'short',
            },
          ]}
          onChange={(value) => setTableMode(value as ResultsTableMode)}
        />
      }
    >
      <div
        style={
          tableMode === 'short'
            ? {
                maxWidth: 720,
                margin: '0 auto',
              }
            : undefined
        }
      >
        <Table
          size="small"
          bordered
          rowKey="key"
          columns={columns}
          dataSource={rows}
          pagination={false}
          scroll={
            tableMode === 'full'
              ? {
                  x: fullScrollX,
                }
              : undefined
          }
          locale={{
            emptyText: 'Студенты не найдены.',
          }}
        />
      </div>
    </Card>
  );
}

function DiscussionFinalGradeInput({
  studentId,
  value,
  min,
  max,
  onSave,
}: {
  studentId: string;
  value: number | null;
  min: number;
  max: number;
  onSave: SaveDiscussionGrade;
}) {
  const [localValue, setLocalValue] = useState<number | null>(value);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isEditing && !isSaving) {
      setLocalValue(value);
    }
  }, [isEditing, isSaving, value]);

  const commit = useCallback(async () => {
    if (localValue === value || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      await onSave(studentId, localValue);
    } catch {
      setLocalValue(value);
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, localValue, onSave, studentId, value]);

  return (
    <InputNumber
      min={min}
      max={max}
      step={1}
      value={localValue}
      style={{ width: '100%' }}
      placeholder="—"
      controls
      onFocus={() => setIsEditing(true)}
      onBlur={() => {
        setIsEditing(false);
        void commit();
      }}
      onChange={(nextValue) => {
        setLocalValue(typeof nextValue === 'number' ? nextValue : null);
      }}
      onPressEnter={(event) => {
        event.currentTarget.blur();
      }}
    />
  );
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
        minWidth: 44,
        textAlign: 'center',
      }}
    >
      {formatGrade(value)}
    </Tag>
  );
}

function AccessDenied() {
  return (
    <Card>
      <Result
        status="403"
        title="Нет прав для просмотра результатов"
        subTitle="Эта страница доступна только участникам сессии: секретарю и членам комиссии, которые заняли свои роли по ссылкам-приглашениям."
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

function SessionNotClosed() {
  return (
    <Card>
      <Result
        status="warning"
        title="Сессия ещё не закрыта"
        subTitle="Итоговая таблица доступна после завершения оценивания секретарём."
        extra={[
          <Link key="sessions" to="/sessions">
            <Button type="primary">К сессиям оценивания</Button>
          </Link>,
        ]}
      />
    </Card>
  );
}

function buildAssessmentIndex(summary?: AssessmentSummaryResponse) {
  const result = new Map<string, StudentAssessmentSummaryResponse>();

  for (const assessment of summary?.assessments ?? []) {
    if (assessment.committeeSlotId && assessment.studentId) {
      result.set(
        createAssessmentKey(assessment.committeeSlotId, assessment.studentId),
        assessment,
      );
    }
  }

  return result;
}

function buildFinalResultsIndex(results?: FinalResultsResponse) {
  const result = new Map<string, FinalStudentResultResponse>();

  for (const item of results?.results ?? []) {
    if (item.studentId) {
      result.set(item.studentId, item);
    }
  }

  return result;
}

function getAssessment({
  assessmentsBySlotAndStudent,
  committeeSlotId,
  studentId,
}: {
  assessmentsBySlotAndStudent: Map<string, StudentAssessmentSummaryResponse>;
  committeeSlotId?: string | null;
  studentId: string;
}) {
  if (!committeeSlotId) {
    return undefined;
  }

  return assessmentsBySlotAndStudent.get(
    createAssessmentKey(committeeSlotId, studentId),
  );
}

function createAssessmentKey(committeeSlotId: string, studentId: string) {
  return `${committeeSlotId}:${studentId}`;
}

function getCriterionScore(
  assessment?: StudentAssessmentSummaryResponse,
  criterionId?: string | null,
) {
  if (!assessment || !criterionId) {
    return null;
  }

  return (
    assessment.criteria?.find((criterion) => criterion.criterionId === criterionId)
      ?.score ?? null
  );
}

function calculateAverageCriterionScore({
  committeeMembers,
  assessmentsBySlotAndStudent,
  studentId,
  criterionId,
}: {
  committeeMembers: CommitteeSlotResponse[];
  assessmentsBySlotAndStudent: Map<string, StudentAssessmentSummaryResponse>;
  studentId: string;
  criterionId?: string | null;
}) {
  if (!criterionId) {
    return null;
  }

  const values = committeeMembers
    .map((member) =>
      getAssessment({
        assessmentsBySlotAndStudent,
        committeeSlotId: member.id,
        studentId,
      }),
    )
    .filter(
      (assessment) =>
        assessment?.presence !== StudentAssessmentPresence.NotPresent,
    )
    .map((assessment) => getCriterionScore(assessment, criterionId))
    .filter((value): value is number => typeof value === 'number');

  return calculateAverage(values);
}

function calculateAverageFinalGrade({
  committeeMembers,
  assessmentsBySlotAndStudent,
  studentId,
}: {
  committeeMembers: CommitteeSlotResponse[];
  assessmentsBySlotAndStudent: Map<string, StudentAssessmentSummaryResponse>;
  studentId: string;
}) {
  const values = committeeMembers
    .map((member) =>
      getAssessment({
        assessmentsBySlotAndStudent,
        committeeSlotId: member.id,
        studentId,
      }),
    )
    .filter(
      (assessment) =>
        assessment?.presence !== StudentAssessmentPresence.NotPresent,
    )
    .map((assessment) => assessment?.finalGrade ?? null)
    .filter((value): value is number => typeof value === 'number');

  return calculateAverage(values);
}

function calculateAverage(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildSaveFinalResultsRequest({
  students,
  finalResultsByStudentId,
  changedStudentId,
  nextFinalGrade,
}: {
  students: StudentResponse[];
  finalResultsByStudentId: Map<string, FinalStudentResultResponse>;
  changedStudentId: string;
  nextFinalGrade: number | null;
}): SaveFinalResultsRequest {
  return {
    results: students
      .filter((student) => Boolean(student.id))
      .map((student) => {
        const studentId = student.id ?? '';

        return {
          studentId,
          finalGrade:
            studentId === changedStudentId
              ? nextFinalGrade
              : finalResultsByStudentId.get(studentId)?.finalGrade ?? null,
        };
      }),
  };
}

function buildResultsCsv({
  rows,
  criteria,
  committeeMembers,
  assessmentsBySlotAndStudent,
  finalResultsByStudentId,
}: {
  rows: ResultsRow[];
  criteria: CriterionResponse[];
  committeeMembers: CommitteeSlotResponse[];
  assessmentsBySlotAndStudent: Map<string, StudentAssessmentSummaryResponse>;
  finalResultsByStudentId: Map<string, FinalStudentResultResponse>;
  finalGradeMin: number;
  finalGradeMax: number;
}) {
  const header = [
    'Студент',
    'Полное имя',
    'Тема',
    ...committeeMembers.flatMap((member) => [
      ...criteria.map(
        (criterion) =>
          `${member.shortName || member.fullName || 'Член комиссии'} — ${
            criterion.title ?? 'Критерий'
          }`,
      ),
      `${member.shortName || member.fullName || 'Член комиссии'} — Итоговая`,
    ]),
    ...criteria.map((criterion) => `Среднее — ${criterion.title ?? 'Критерий'}`),
    'Среднее — Итоговая',
    'Оценка после обсуждения',
  ];

  const csvRows = rows.map((row) => [
    row.shortName,
    row.fullName,
    row.topic,
    ...committeeMembers.flatMap((member) => {
      const assessment = getAssessment({
        assessmentsBySlotAndStudent,
        committeeSlotId: member.id,
        studentId: row.studentId,
      });

      if (assessment?.presence === StudentAssessmentPresence.NotPresent) {
        return [
          ...criteria.map(() => 'Воздержался от оценки'),
          'Воздержался от оценки',
        ];
      }

      return [
        ...criteria.map((criterion) =>
          formatCsvGrade(getCriterionScore(assessment, criterion.id)),
        ),
        formatCsvGrade(assessment?.finalGrade ?? null),
      ];
    }),
    ...criteria.map((criterion) =>
      formatCsvGrade(
        calculateAverageCriterionScore({
          committeeMembers,
          assessmentsBySlotAndStudent,
          studentId: row.studentId,
          criterionId: criterion.id,
        }),
      ),
    ),
    formatCsvGrade(
      calculateAverageFinalGrade({
        committeeMembers,
        assessmentsBySlotAndStudent,
        studentId: row.studentId,
      }),
    ),
    formatCsvGrade(finalResultsByStudentId.get(row.studentId)?.finalGrade ?? null),
  ]);

  return [header, ...csvRows]
    .map((row) => row.map(escapeCsvCell).join(';'))
    .join('\n');
}

function formatCsvGrade(value: number | null) {
  return value === null || value === undefined ? '' : formatGrade(value);
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

function getScoreColor(value: number, min: number, max: number) {
  const normalized = max === min ? 1 : clamp((value - min) / (max - min), 0, 1);

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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatGrade(value: number) {
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
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