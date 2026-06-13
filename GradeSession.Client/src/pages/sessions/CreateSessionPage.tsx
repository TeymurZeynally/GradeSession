import {
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Divider,
  Form,
  Grid,
  Input,
  InputNumber,
  Layout,
  Select,
  Space,
  Table,
  Typography,
  Upload,
  message,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { usePostApiV1Sessions } from '@/shared/api/generated/sessions/sessions';
import {
  SessionParticipantRole,
  type CommitteeSlotRequest,
  type CreateSessionRequest,
  type CriterionRequest,
  type StudentRequest,
} from '@/shared/api/generated/model';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

type StudentRow = {
  key: string;
  fullName: string;
  shortName: string;
  shortNameEdited: boolean;
  topic: string;
  comment: string;
};

type CriterionRow = {
  key: string;
  title: string;
  description: string;
  minScore: number;
  maxScore: number;
  weight: number;
};

type CommitteeRow = {
  key: string;
  role: SessionParticipantRole;
  fullName: string;
  shortName: string;
  shortNameEdited: boolean;
};

type SessionFormState = {
  title: string;
  finalGradeMinScore: number;
  finalGradeMaxScore: number;
};

type StudentField = 'fullName' | 'shortName' | 'topic';
type CriterionField = 'title' | 'minScore' | 'maxScore' | 'weight';
type CommitteeField = 'role' | 'fullName' | 'shortName';
type FormField = 'title' | 'finalGradeMinScore' | 'finalGradeMaxScore';
type SectionName = 'students' | 'criteria' | 'committee';

type RowErrors<TField extends string> = Record<
  string,
  Partial<Record<TField, string>>
>;

type ValidationState = {
  form: Partial<Record<FormField, string>>;
  sections: Partial<Record<SectionName, string>>;
  students: RowErrors<StudentField>;
  criteria: RowErrors<CriterionField>;
  committee: RowErrors<CommitteeField>;
  errorCount: number;
};

const defaultCriteria: CriterionRow[] = [
  {
    key: createClientId(),
    title: 'Доклад',
    description:
      'Оценивается качество визуального оформления и структура материалов, устное представление работы студентом.',
    minScore: 2,
    maxScore: 5,
    weight: 1,
  },
  {
    key: createClientId(),
    title: 'Проект',
    description:
      'Оценивается техническое исполнение проекта, выбор и применение инструментов.',
    minScore: 2,
    maxScore: 5,
    weight: 1,
  },
  {
    key: createClientId(),
    title: 'Вопросы',
    description:
      'Оценивается, как студент отвечает на вопросы комиссии. Учитываются понимание темы, аргументированность и полнота ответов.',
    minScore: 2,
    maxScore: 5,
    weight: 1,
  },
];

const defaultCommittee: CommitteeRow[] = [
  {
    key: createClientId(),
    role: SessionParticipantRole.Secretary,
    fullName: '',
    shortName: '',
    shortNameEdited: false,
  },
  {
    key: createClientId(),
    role: SessionParticipantRole.CommitteeMember,
    fullName: '',
    shortName: '',
    shortNameEdited: false,
  },
];

export function CreateSessionPage() {
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [hasSubmitted, setHasSubmitted] = useState(false);

  const [formState, setFormState] = useState<SessionFormState>({
    title: '',
    finalGradeMinScore: 2,
    finalGradeMaxScore: 5,
  });

  const [studentsCsv, setStudentsCsv] = useState('');
  const [committeeCsv, setCommitteeCsv] = useState('');

  const [studentsAppliedText, setStudentsAppliedText] = useState('');
  const [committeeAppliedText, setCommitteeAppliedText] = useState('');

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [criteria, setCriteria] = useState<CriterionRow[]>(defaultCriteria);
  const [committee, setCommittee] = useState<CommitteeRow[]>(defaultCommittee);

  const createSessionMutation = usePostApiV1Sessions();

  const parsedStudents = useMemo(
    () => parseStudentsCsv(studentsCsv),
    [studentsCsv],
  );

  const parsedCommittee = useMemo(
    () => parseCommitteeCsv(committeeCsv),
    [committeeCsv],
  );

  const studentsPreviewIsApplied =
    parsedStudents.length > 0 &&
    normalizeImportText(studentsCsv) === normalizeImportText(studentsAppliedText);

  const committeePreviewIsApplied =
    parsedCommittee.length > 0 &&
    normalizeImportText(committeeCsv) ===
      normalizeImportText(committeeAppliedText);

  const validation = useMemo(
    () =>
      validateCreateSession({
        formState,
        students,
        criteria,
        committee,
      }),
    [formState, students, criteria, committee],
  );

  const visibleValidation = hasSubmitted ? validation : emptyValidation();

  const importStudentsText = (text: string) => {
    const parsed = parseStudentsCsv(text);

    setStudentsCsv(text);
    setStudents(parsed);
    setStudentsAppliedText(text);

    if (parsed.length === 0) {
      message.warning('В файле не найдено строк со студентами.');
      return;
    }

    message.success(`Импортировано студентов: ${parsed.length}`);
  };

  const importCommitteeText = (text: string) => {
    const parsed = parseCommitteeCsv(text);

    setCommitteeCsv(text);
    setCommittee(parsed);
    setCommitteeAppliedText(text);

    if (parsed.length === 0) {
      message.warning('В файле не найдено участников комиссии.');
      return;
    }

    message.success(`Импортировано участников комиссии: ${parsed.length}`);
  };

  const submit = async () => {
    setHasSubmitted(true);

    if (validation.errorCount > 0) {
      message.error('Проверьте поля формы.');
      return;
    }

    const request: CreateSessionRequest = {
      title: formState.title.trim(),
      settings: {
        finalGradeMinScore: formState.finalGradeMinScore,
        finalGradeMaxScore: formState.finalGradeMaxScore,
      },
      students: students.map(toStudentRequest),
      criteria: criteria.map(toCriterionRequest),
      committee: committee.map(toCommitteeRequest),
    };

    const createdSession = await createSessionMutation.mutateAsync({
      data: request,
    });

    message.success('Сессия создана.');

    if (createdSession.id) {
      navigate(`/sessions/${createdSession.id}/invites`);
      return;
    }

    navigate('/sessions');
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
          <PageHeader />

          <Card title="Основная информация">
            <Form layout="vertical">
              <Form.Item
                label="Название сессии"
                required
                validateStatus={visibleValidation.form.title ? 'error' : undefined}
                help={visibleValidation.form.title ?? ' '}
              >
                <Input
                  size="large"
                  placeholder="Защита ВКР, группа ИВТ-41"
                  value={formState.title}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                />
              </Form.Item>

              <Space
                orientation={isMobile ? 'vertical' : 'horizontal'}
                size={16}
                style={{ width: '100%' }}
              >
                <Form.Item
                  label="Минимальная итоговая оценка"
                  required
                  validateStatus={
                    visibleValidation.form.finalGradeMinScore
                      ? 'error'
                      : undefined
                  }
                  help={visibleValidation.form.finalGradeMinScore ?? ' '}
                >
                  <InputNumber
                    min={0}
                    max={100}
                    value={formState.finalGradeMinScore}
                    onChange={(value) =>
                      setFormState((current) => ({
                        ...current,
                        finalGradeMinScore: normalizeNumber(value, 2),
                      }))
                    }
                    style={{ width: isMobile ? '100%' : 240 }}
                  />
                </Form.Item>

                <Form.Item
                  label="Максимальная итоговая оценка"
                  required
                  validateStatus={
                    visibleValidation.form.finalGradeMaxScore
                      ? 'error'
                      : undefined
                  }
                  help={visibleValidation.form.finalGradeMaxScore ?? ' '}
                >
                  <InputNumber
                    min={0}
                    max={100}
                    value={formState.finalGradeMaxScore}
                    onChange={(value) =>
                      setFormState((current) => ({
                        ...current,
                        finalGradeMaxScore: normalizeNumber(value, 5),
                      }))
                    }
                    style={{ width: isMobile ? '100%' : 240 }}
                  />
                </Form.Item>
              </Space>
            </Form>
          </Card>

          <Card title="Студенты">
            <Space orientation="vertical" size={16} style={{ width: '100%' }}>
              <Alert
                type="info"
                showIcon
                message="Можно вставить список студентов или загрузить CSV/TXT-файл"
                description={
                  <Space orientation="vertical" size={4}>
                    <Text>
                      Формат: <Text code>ФИО;Тема</Text>
                    </Text>
                    <Text>
                      Расширенный формат:{' '}
                      <Text code>ФИО;Тема;Комментарий</Text>
                    </Text>
                    <Text>
                      При загрузке файла данные сразу попадают в итоговую
                      таблицу. При ручной вставке текста нажмите “Перенести в
                      итоговую таблицу”.
                    </Text>
                  </Space>
                }
              />

              <TextArea
                rows={7}
                placeholder={[
                  'Иванов Иван Иванович;Разработка информационной системы',
                  'Петрова Анна Сергеевна;Исследование методов анализа данных;Работа по ходатайству',
                ].join('\n')}
                value={studentsCsv}
                onChange={(event) => setStudentsCsv(event.target.value)}
              />

              <Space wrap>
                <Upload
                  accept=".csv,.txt"
                  showUploadList={false}
                  beforeUpload={(file) => {
                    void file
                      .text()
                      .then(importStudentsText)
                      .catch(() => {
                        message.error('Не удалось прочитать файл со студентами.');
                      });

                    return false;
                  }}
                >
                  <Button icon={<UploadOutlined />}>
                    Загрузить и импортировать файл
                  </Button>
                </Upload>

                <Button
                  type={studentsPreviewIsApplied ? 'default' : 'primary'}
                  disabled={
                    parsedStudents.length === 0 || studentsPreviewIsApplied
                  }
                  onClick={() => importStudentsText(studentsCsv)}
                >
                  {studentsPreviewIsApplied
                    ? 'Уже в итоговой таблице'
                    : 'Перенести в итоговую таблицу'}
                </Button>

                <Text type="secondary">
                  Найдено строк: {parsedStudents.length}
                </Text>
              </Space>

              {parsedStudents.length > 0 && (
                <>
                  <Divider style={{ margin: '8px 0' }} />

                  <div>
                    <Space
                      orientation="vertical"
                      size={8}
                      style={{ width: '100%' }}
                    >
                      <div>
                        <Text strong>
                          {studentsPreviewIsApplied
                            ? 'Предпросмотр загруженных данных'
                            : 'Предпросмотр перед переносом в таблицу'}
                        </Text>

                        <Paragraph
                          type="secondary"
                          style={{ marginTop: 4, marginBottom: 0 }}
                        >
                          {studentsPreviewIsApplied
                            ? 'Эти данные уже перенесены в итоговую таблицу ниже. Можно сразу редактировать таблицу.'
                            : 'Эти данные пока только распознаны из текста. Чтобы они участвовали в создании сессии, перенесите их в итоговую таблицу.'}
                        </Paragraph>
                      </div>

                      <StudentsTable
                        rows={parsedStudents}
                        readonly
                        errors={{}}
                        onChange={() => undefined}
                        onRemove={() => undefined}
                      />
                    </Space>
                  </div>
                </>
              )}

              <Divider style={{ margin: '8px 0' }} />

              <Space
                orientation={isMobile ? 'vertical' : 'horizontal'}
                align={isMobile ? 'start' : 'center'}
                style={{ width: '100%', justifyContent: 'space-between' }}
              >
                <Text strong>Итоговая таблица студентов</Text>
              </Space>

              <Space wrap>
                <Button
                  icon={<PlusOutlined />}
                  onClick={() =>
                    setStudents((current) => [
                      ...current,
                      createEmptyStudentRow(),
                    ])
                  }
                >
                  Добавить строку
                </Button>

                <Button icon={<DeleteOutlined />} onClick={() => setStudents([])}>
                  Очистить таблицу
                </Button>
              </Space>

              <SectionError message={visibleValidation.sections.students} />

              <StudentsTable
                rows={students}
                errors={visibleValidation.students}
                onChange={setStudents}
                onRemove={(key) =>
                  setStudents((current) =>
                    current.filter((student) => student.key !== key),
                  )
                }
              />
            </Space>
          </Card>

          <Card title="Критерии оценивания">
            <Space orientation="vertical" size={16} style={{ width: '100%' }}>
              <Text type="secondary">
                Критерии применяются ко всем студентам. Каждый член комиссии
                выставляет оценку по каждому критерию в пределах от минимального
                до максимального балла. Название критерия должно быть кратким,
                так как оно используется в таблице оценивания. Вес показывает
                значимость критерия и учитывается при вычислении расчётной
                оценки.
              </Text>

              <Space wrap>
                <Button
                  icon={<PlusOutlined />}
                  onClick={() =>
                    setCriteria((current) => [
                      ...current,
                      {
                        key: createClientId(),
                        title: '',
                        description: '',
                        minScore: formState.finalGradeMinScore,
                        maxScore: formState.finalGradeMaxScore,
                        weight: 1,
                      },
                    ])
                  }
                >
                  Добавить критерий
                </Button>

                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => setCriteria(defaultCriteria)}
                >
                  Сбросить критерии
                </Button>

                <Button icon={<DeleteOutlined />} onClick={() => setCriteria([])}>
                  Очистить критерии
                </Button>
              </Space>

              <SectionError message={visibleValidation.sections.criteria} />

              <CriteriaTable
                rows={criteria}
                errors={visibleValidation.criteria}
                onChange={setCriteria}
                onRemove={(key) =>
                  setCriteria((current) =>
                    current.filter((criterion) => criterion.key !== key),
                  )
                }
              />
            </Space>
          </Card>

          <Card title="Состав комиссии">
            <Space orientation="vertical" size={16} style={{ width: '100%' }}>
              <Alert
                type="info"
                showIcon
                message="Состав комиссии можно вставить списком или загрузить CSV/TXT-файл"
                description={
                  <Space orientation="vertical" size={4}>
                    <Text>
                      Формат: <Text code>ФИО</Text> или{' '}
                      <Text code>ФИО;Роль</Text>
                    </Text>
                    <Text>
                      Роль можно писать как <Text code>Секретарь</Text> или{' '}
                      <Text code>Член комиссии</Text>. Если роль не указана,
                      строка считается членом комиссии.
                    </Text>
                    <Text>
                      При загрузке файла данные сразу попадают в итоговый состав.
                      При ручной вставке текста нажмите “Перенести в итоговый
                      состав”.
                    </Text>
                  </Space>
                }
              />

              <TextArea
                rows={6}
                placeholder={[
                  'Сидорова Мария Павловна;Секретарь',
                  'Петров Пётр Петрович',
                  'Иванов Иван Иванович;Член комиссии',
                ].join('\n')}
                value={committeeCsv}
                onChange={(event) => setCommitteeCsv(event.target.value)}
              />

              <Space wrap>
                <Upload
                  accept=".csv,.txt"
                  showUploadList={false}
                  beforeUpload={(file) => {
                    void file
                      .text()
                      .then(importCommitteeText)
                      .catch(() => {
                        message.error(
                          'Не удалось прочитать файл с составом комиссии.',
                        );
                      });

                    return false;
                  }}
                >
                  <Button icon={<UploadOutlined />}>
                    Загрузить и импортировать файл
                  </Button>
                </Upload>

                <Button
                  type={committeePreviewIsApplied ? 'default' : 'primary'}
                  disabled={
                    parsedCommittee.length === 0 || committeePreviewIsApplied
                  }
                  onClick={() => importCommitteeText(committeeCsv)}
                >
                  {committeePreviewIsApplied
                    ? 'Уже в итоговом составе'
                    : 'Перенести в итоговый состав'}
                </Button>

                <Text type="secondary">
                  Найдено строк: {parsedCommittee.length}
                </Text>
              </Space>

              {parsedCommittee.length > 0 && (
                <>
                  <Divider style={{ margin: '8px 0' }} />

                  <div>
                    <Space
                      orientation="vertical"
                      size={8}
                      style={{ width: '100%' }}
                    >
                      <div>
                        <Text strong>
                          {committeePreviewIsApplied
                            ? 'Предпросмотр загруженных данных'
                            : 'Предпросмотр перед переносом в итоговый состав'}
                        </Text>

                        <Paragraph
                          type="secondary"
                          style={{ marginTop: 4, marginBottom: 0 }}
                        >
                          {committeePreviewIsApplied
                            ? 'Эти данные уже перенесены в итоговый состав ниже. Можно сразу редактировать таблицу.'
                            : 'Эти данные пока только распознаны из текста. Чтобы они участвовали в создании сессии, перенесите их в итоговый состав.'}
                        </Paragraph>
                      </div>

                      <CommitteeTable
                        rows={parsedCommittee}
                        readonly
                        errors={{}}
                        onChange={() => undefined}
                        onRemove={() => undefined}
                      />
                    </Space>
                  </div>
                </>
              )}

              <Divider style={{ margin: '8px 0' }} />

              <Space
                orientation={isMobile ? 'vertical' : 'horizontal'}
                align={isMobile ? 'start' : 'center'}
                style={{ width: '100%', justifyContent: 'space-between' }}
              >
                <Text strong>Итоговый состав комиссии</Text>
              </Space>

              <Space wrap>
                <Button
                  icon={<PlusOutlined />}
                  onClick={() =>
                    setCommittee((current) => [
                      ...current,
                      createEmptyCommitteeRow(),
                    ])
                  }
                >
                  Добавить участника
                </Button>

                <Button
                  icon={<DeleteOutlined />}
                  onClick={() => setCommittee([])}
                >
                  Очистить участников
                </Button>
              </Space>

              <SectionError message={visibleValidation.sections.committee} />

              <CommitteeTable
                rows={committee}
                errors={visibleValidation.committee}
                onChange={setCommittee}
                onRemove={(key) =>
                  setCommittee((current) =>
                    current.filter((member) => member.key !== key),
                  )
                }
              />
            </Space>
          </Card>

          <Card>
            <Space
              orientation={isMobile ? 'vertical' : 'horizontal'}
              style={{ width: '100%', justifyContent: 'space-between' }}
            >
              <Link to="/sessions">
                <Button block={isMobile}>Назад к сессиям</Button>
              </Link>

              <Button
                type="primary"
                size="large"
                block={isMobile}
                loading={createSessionMutation.isPending}
                onClick={submit}
              >
                Создать сессию
              </Button>
            </Space>
          </Card>
        </Space>
      </Content>
    </Layout>
  );
}

function PageHeader() {
  return (
    <Card>
      <Title level={2} style={{ marginTop: 0, marginBottom: 8 }}>
        Создание сессии оценивания
      </Title>

      <Paragraph type="secondary" style={{ marginBottom: 0 }}>
        Заполните основные данные, вставьте список студентов, настройте критерии
        и состав комиссии.
      </Paragraph>
    </Card>
  );
}

function StudentsTable({
  rows,
  readonly = false,
  errors,
  onChange,
  onRemove,
}: {
  rows: StudentRow[];
  readonly?: boolean;
  errors: RowErrors<StudentField>;
  onChange: (rows: StudentRow[]) => void;
  onRemove: (key: string) => void;
}) {
  const updateRow = (key: string, patch: Partial<StudentRow>) => {
    onChange(
      rows.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  };

  const columns: TableColumnsType<StudentRow> = [
    {
      title: 'ФИО',
      dataIndex: 'fullName',
      width: 280,
      render: (_, row) =>
        readonly ? (
          row.fullName
        ) : (
          <CellControl error={errors[row.key]?.fullName}>
            <Input
              status={errors[row.key]?.fullName ? 'error' : undefined}
              value={row.fullName}
              placeholder="Иванов Иван Иванович"
              onChange={(event) => {
                const fullName = event.target.value;

                updateRow(row.key, {
                  fullName,
                  shortName: row.shortNameEdited
                    ? row.shortName
                    : buildShortName(fullName),
                });
              }}
            />
          </CellControl>
        ),
    },
    {
      title: 'Краткое имя',
      dataIndex: 'shortName',
      width: 190,
      render: (_, row) =>
        readonly ? (
          row.shortName
        ) : (
          <CellControl error={errors[row.key]?.shortName}>
            <Input
              status={errors[row.key]?.shortName ? 'error' : undefined}
              value={row.shortName}
              placeholder="Иванов И.И."
              onChange={(event) =>
                updateRow(row.key, {
                  shortName: event.target.value,
                  shortNameEdited: true,
                })
              }
            />
          </CellControl>
        ),
    },
    {
      title: 'Тема',
      dataIndex: 'topic',
      width: 360,
      render: (_, row) =>
        readonly ? (
          row.topic
        ) : (
          <CellControl error={errors[row.key]?.topic}>
            <Input
              status={errors[row.key]?.topic ? 'error' : undefined}
              value={row.topic}
              placeholder="Тема дипломной работы"
              onChange={(event) =>
                updateRow(row.key, { topic: event.target.value })
              }
            />
          </CellControl>
        ),
    },
    {
      title: 'Комментарий',
      dataIndex: 'comment',
      width: 260,
      render: (_, row) =>
        readonly ? (
          row.comment || '—'
        ) : (
          <CellControl>
            <Input
              value={row.comment}
              placeholder="Необязательно"
              onChange={(event) =>
                updateRow(row.key, { comment: event.target.value })
              }
            />
          </CellControl>
        ),
    },
  ];

  if (!readonly) {
    columns.push({
      title: '',
      key: 'actions',
      width: 64,
      fixed: 'right',
      render: (_, row) => (
        <CellControl>
          <Button
            danger
            type="text"
            icon={<DeleteOutlined />}
            onClick={() => onRemove(row.key)}
          />
        </CellControl>
      ),
    });
  }

  return (
    <Table
      rowKey="key"
      size="small"
      pagination={false}
      dataSource={rows}
      columns={columns}
      scroll={{ x: 1100 }}
      locale={{ emptyText: 'Студенты не добавлены' }}
    />
  );
}

function CriteriaTable({
  rows,
  errors,
  onChange,
  onRemove,
}: {
  rows: CriterionRow[];
  errors: RowErrors<CriterionField>;
  onChange: (rows: CriterionRow[]) => void;
  onRemove: (key: string) => void;
}) {
  const updateRow = (key: string, patch: Partial<CriterionRow>) => {
    onChange(
      rows.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  };

  const columns: TableColumnsType<CriterionRow> = [
    {
      title: 'Название',
      dataIndex: 'title',
      width: 140,
      render: (_, row) => (
        <CellControl error={errors[row.key]?.title}>
          <Input
            status={errors[row.key]?.title ? 'error' : undefined}
            value={row.title}
            placeholder="Критерий"
            onChange={(event) =>
              updateRow(row.key, { title: event.target.value })
            }
          />
        </CellControl>
      ),
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      width: 300,
      render: (_, row) => (
        <CellControl>
          <Input
            value={row.description}
            placeholder="Необязательно"
            onChange={(event) =>
              updateRow(row.key, { description: event.target.value })
            }
          />
        </CellControl>
      ),
    },
    {
      title: 'Мин.',
      dataIndex: 'minScore',
      width: 130,
      render: (_, row) => (
        <CellControl error={errors[row.key]?.minScore}>
          <InputNumber
            min={0}
            max={100}
            status={errors[row.key]?.minScore ? 'error' : undefined}
            value={row.minScore}
            onChange={(value) =>
              updateRow(row.key, { minScore: normalizeNumber(value, 2) })
            }
            style={{ width: '100%' }}
          />
        </CellControl>
      ),
    },
    {
      title: 'Макс.',
      dataIndex: 'maxScore',
      width: 150,
      render: (_, row) => (
        <CellControl error={errors[row.key]?.maxScore}>
          <InputNumber
            min={0}
            max={100}
            status={errors[row.key]?.maxScore ? 'error' : undefined}
            value={row.maxScore}
            onChange={(value) =>
              updateRow(row.key, { maxScore: normalizeNumber(value, 5) })
            }
            style={{ width: '100%' }}
          />
        </CellControl>
      ),
    },
    {
      title: 'Вес',
      dataIndex: 'weight',
      width: 130,
      render: (_, row) => (
        <CellControl error={errors[row.key]?.weight}>
          <InputNumber
            min={0}
            max={100}
            step={0.1}
            status={errors[row.key]?.weight ? 'error' : undefined}
            value={row.weight}
            onChange={(value) =>
              updateRow(row.key, { weight: normalizeNumber(value, 1) })
            }
            style={{ width: '100%' }}
          />
        </CellControl>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 64,
      fixed: 'right',
      render: (_, row) => (
        <CellControl>
          <Button
            danger
            type="text"
            icon={<DeleteOutlined />}
            onClick={() => onRemove(row.key)}
          />
        </CellControl>
      ),
    },
  ];

  return (
    <Table
      rowKey="key"
      size="small"
      pagination={false}
      dataSource={rows}
      columns={columns}
      scroll={{ x: 1020 }}
      locale={{ emptyText: 'Критерии не добавлены' }}
    />
  );
}

function CommitteeTable({
  rows,
  readonly = false,
  errors,
  onChange,
  onRemove,
}: {
  rows: CommitteeRow[];
  readonly?: boolean;
  errors: RowErrors<CommitteeField>;
  onChange: (rows: CommitteeRow[]) => void;
  onRemove: (key: string) => void;
}) {
  const updateRow = (key: string, patch: Partial<CommitteeRow>) => {
    onChange(
      rows.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  };

  const columns: TableColumnsType<CommitteeRow> = [
    {
      title: 'Роль',
      dataIndex: 'role',
      width: 110,
      render: (_, row) =>
        readonly ? (
          getCommitteeRoleLabel(row.role)
        ) : (
          <CellControl error={errors[row.key]?.role}>
            <Select
              status={errors[row.key]?.role ? 'error' : undefined}
              value={row.role}
              onChange={(role) => updateRow(row.key, { role })}
              style={{ width: '100%' }}
              options={[
                {
                  value: SessionParticipantRole.Secretary,
                  label: 'Секретарь',
                },
                {
                  value: SessionParticipantRole.CommitteeMember,
                  label: 'Член комиссии',
                },
              ]}
            />
          </CellControl>
        ),
    },
    {
      title: 'ФИО',
      dataIndex: 'fullName',
      width: 340,
      render: (_, row) =>
        readonly ? (
          row.fullName
        ) : (
          <CellControl error={errors[row.key]?.fullName}>
            <Input
              status={errors[row.key]?.fullName ? 'error' : undefined}
              value={row.fullName}
              placeholder="Петров Пётр Петрович"
              onChange={(event) => {
                const fullName = event.target.value;

                updateRow(row.key, {
                  fullName,
                  shortName: row.shortNameEdited
                    ? row.shortName
                    : buildCommitteeShortName(fullName, row.role),
                });
              }}
            />
          </CellControl>
        ),
    },
    {
      title: 'Краткое имя',
      dataIndex: 'shortName',
      width: 200,
      render: (_, row) =>
        readonly ? (
          row.shortName
        ) : (
          <CellControl error={errors[row.key]?.shortName}>
            <Input
              status={errors[row.key]?.shortName ? 'error' : undefined}
              value={row.shortName}
              placeholder="Петров П.П."
              onChange={(event) =>
                updateRow(row.key, {
                  shortName: event.target.value,
                  shortNameEdited: true,
                })
              }
            />
          </CellControl>
        ),
    },
  ];

  if (!readonly) {
    columns.push({
      title: '',
      key: 'actions',
      width: 64,
      fixed: 'right',
      render: (_, row) => (
        <CellControl>
          <Button
            danger
            type="text"
            icon={<DeleteOutlined />}
            onClick={() => onRemove(row.key)}
          />
        </CellControl>
      ),
    });
  }

  return (
    <Table
      rowKey="key"
      size="small"
      pagination={false}
      dataSource={rows}
      columns={columns}
      scroll={{ x: 860 }}
      locale={{ emptyText: 'Состав комиссии не заполнен' }}
    />
  );
}

function CellControl({
  children,
  error,
}: {
  children: ReactNode;
  error?: string;
}) {
  return (
    <div style={{ minHeight: 58 }}>
      {children}

      <div
        style={{
          minHeight: 18,
          lineHeight: '18px',
          marginTop: 4,
        }}
      >
        {error ? (
          <Text type="danger" style={{ fontSize: 12 }}>
            {error}
          </Text>
        ) : (
          <span>&nbsp;</span>
        )}
      </div>
    </div>
  );
}

function SectionError({ message: errorMessage }: { message?: string }) {
  if (!errorMessage) {
    return null;
  }

  return <Alert type="error" showIcon message={errorMessage} />;
}

function parseStudentsCsv(text: string): StudentRow[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\uFEFF/, '').trim())
    .filter(Boolean)
    .map(parseSeparatedLine)
    .map((columns) => columns.map((column) => column.trim()))
    .filter((columns) => columns.some(Boolean))
    .map((columns) => {
      const [fullName = '', topic = '', ...commentParts] = columns;
      const comment = commentParts.join(';').trim();

      return {
        key: createClientId(),
        fullName,
        shortName: buildShortName(fullName),
        shortNameEdited: false,
        topic,
        comment,
      };
    });
}

function parseCommitteeCsv(text: string): CommitteeRow[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\uFEFF/, '').trim())
    .filter(Boolean)
    .map(parseSeparatedLine)
    .map(([fullName = '', roleText = '']) => {
      const role =
        parseCommitteeRole(roleText.trim()) ??
        SessionParticipantRole.CommitteeMember;

      return createCommitteeRow({
        fullName: fullName.trim(),
        role,
      });
    })
    .filter((row) => row.fullName);
}

function parseSeparatedLine(line: string): string[] {
  const delimiter = line.includes(';') ? ';' : '\t';
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current);

  return result;
}

function parseCommitteeRole(value: string): SessionParticipantRole | null {
  const normalized = value.trim().toLowerCase();

  if (
    normalized === 'секретарь' ||
    normalized === 'secretary' ||
    normalized === 'sec'
  ) {
    return SessionParticipantRole.Secretary;
  }

  if (
    normalized === 'член комиссии' ||
    normalized === 'член' ||
    normalized === 'комиссия' ||
    normalized === 'committee member' ||
    normalized === 'committeemember' ||
    normalized === 'member'
  ) {
    return SessionParticipantRole.CommitteeMember;
  }

  return null;
}

function buildShortName(fullName: string): string {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return '';
  }

  if (parts.length === 1) {
    return parts[0];
  }

  const [lastName, ...nameParts] = parts;

  const initials = nameParts
    .slice(0, 2)
    .map((part) => `${part[0].toUpperCase()}.`)
    .join('');

  return `${lastName} ${initials}`.trim();
}

function buildCommitteeShortName(
  fullName: string,
  role: SessionParticipantRole,
): string {
  const normalizedFullName = fullName.trim().toLowerCase();

  if (
    role === SessionParticipantRole.Secretary &&
    normalizedFullName.includes('секретар')
  ) {
    return 'Секретарь';
  }

  return buildShortName(fullName);
}

function getCommitteeRoleLabel(role?: SessionParticipantRole) {
  switch (role) {
    case SessionParticipantRole.Secretary:
      return 'Секретарь';

    case SessionParticipantRole.CommitteeMember:
      return 'Член комиссии';

    default:
      return 'Не указана';
  }
}

function validateCreateSession({
  formState,
  students,
  criteria,
  committee,
}: {
  formState: SessionFormState;
  students: StudentRow[];
  criteria: CriterionRow[];
  committee: CommitteeRow[];
}): ValidationState {
  const validation = emptyValidation();

  const addFormError = (field: FormField, message: string) => {
    validation.form[field] = message;
    validation.errorCount += 1;
  };

  const addSectionError = (section: SectionName, message: string) => {
    validation.sections[section] = message;
    validation.errorCount += 1;
  };

  const addStudentError = (
    rowKey: string,
    field: StudentField,
    message: string,
  ) => {
    validation.students[rowKey] = {
      ...validation.students[rowKey],
      [field]: message,
    };
    validation.errorCount += 1;
  };

  const addCriterionError = (
    rowKey: string,
    field: CriterionField,
    message: string,
  ) => {
    validation.criteria[rowKey] = {
      ...validation.criteria[rowKey],
      [field]: message,
    };
    validation.errorCount += 1;
  };

  const addCommitteeError = (
    rowKey: string,
    field: CommitteeField,
    message: string,
  ) => {
    validation.committee[rowKey] = {
      ...validation.committee[rowKey],
      [field]: message,
    };
    validation.errorCount += 1;
  };

  if (!formState.title.trim()) {
    addFormError('title', 'Укажите название сессии.');
  }

  if (formState.finalGradeMinScore < 0) {
    addFormError('finalGradeMinScore', 'Минимальная оценка не должна быть меньше 0.');
  }

  if (formState.finalGradeMinScore > 1000) {
    addFormError('finalGradeMinScore', 'Минимальная оценка не должна быть больше 1000.');
  }

  if (formState.finalGradeMaxScore < 0) {
    addFormError('finalGradeMaxScore', 'Максимальная оценка не должна быть меньше 0.');
  }

  if (formState.finalGradeMaxScore > 1000) {
    addFormError('finalGradeMaxScore', 'Максимальная оценка не должна быть больше 1000.');
  }

  if (formState.finalGradeMinScore > formState.finalGradeMaxScore) {
    addFormError('finalGradeMaxScore', 'Максимальная оценка должна быть не меньше минимальной.');
  }

  if (students.length === 0) {
    addSectionError('students', 'Добавьте хотя бы одного студента.');
  }

  if (students.length > 50) {
    addSectionError('students', 'Разрешено не более 300 студентов.');
  }

  students.forEach((student) => {
    if (!student.fullName.trim()) {
      addStudentError(student.key, 'fullName', 'Укажите ФИО.');
    }

    if (!student.shortName.trim()) {
      addStudentError(student.key, 'shortName', 'Укажите краткое имя.');
    }

    if (!student.topic.trim()) {
      addStudentError(student.key, 'topic', 'Укажите тему.');
    }
  });

  if (criteria.length > 50) {
    addSectionError('criteria', 'Разрешено не более 50 критериев.');
  }

  criteria.forEach((criterion) => {
    if (!criterion.title.trim()) {
      addCriterionError(criterion.key, 'title', 'Укажите название.');
    }

    if (criterion.minScore < 0) {
      addCriterionError(criterion.key, 'minScore', 'Мин. не должен быть меньше 0.'    );
    }

    if (criterion.minScore > 1000) {
      addCriterionError(criterion.key, 'minScore', 'Мин. не должен быть больше 1000.'    );
    }

    if (criterion.maxScore < 0) {
      addCriterionError(criterion.key, 'maxScore', 'Макс. не должен быть меньше 0.'    );
    }

    if (criterion.maxScore > 1000) {
      addCriterionError(criterion.key, 'maxScore', 'Макс. не должен быть больше 1000.'    );
    }

    if (criterion.minScore > criterion.maxScore) {
      addCriterionError(
        criterion.key,
        'maxScore',
        'Макс. должен быть не меньше мин.',
      );
    }

    if (criterion.weight <= 0) {
      addCriterionError(criterion.key, 'weight', 'Вес должен быть больше 0.');
    }

    if (criterion.weight > 100) {
      addCriterionError(criterion.key, 'weight', 'Вес должен быть меньше 100.');
    }
  });

  if (committee.length === 0) {
    addSectionError('committee', 'Добавьте хотя бы одного участника комиссии.');
  }

  if (committee.length > 50) {
    addSectionError('committee', 'Разрешено не более 50 членов комиссии.');
  }

  if (
    committee.length > 0 &&
    !committee.some((member) => member.role === SessionParticipantRole.Secretary)
  ) {
    addSectionError('committee', 'Добавьте хотя бы одного секретаря.');
  }

  if (
    committee.length > 0 &&
    !committee.some(
      (member) => member.role === SessionParticipantRole.CommitteeMember,
    )
  ) {
    addSectionError('committee', 'Добавьте хотя бы одного члена комиссии.');
  }

  committee.forEach((member) => {
    if (!member.role) {
      addCommitteeError(member.key, 'role', 'Укажите роль.');
    }

    if (!member.fullName.trim()) {
      addCommitteeError(member.key, 'fullName', 'Укажите ФИО или название.');
    }

    if (!member.shortName.trim()) {
      addCommitteeError(member.key, 'shortName', 'Укажите краткое имя.');
    }
  });

  return validation;
}

function emptyValidation(): ValidationState {
  return {
    form: {},
    sections: {},
    students: {},
    criteria: {},
    committee: {},
    errorCount: 0,
  };
}

function createEmptyStudentRow(): StudentRow {
  return {
    key: createClientId(),
    fullName: '',
    shortName: '',
    shortNameEdited: false,
    topic: '',
    comment: '',
  };
}

function createEmptyCommitteeRow(): CommitteeRow {
  return createCommitteeRow({
    role: SessionParticipantRole.CommitteeMember,
    fullName: '',
  });
}

function createCommitteeRow({
  role,
  fullName,
}: {
  role: SessionParticipantRole;
  fullName: string;
}): CommitteeRow {
  return {
    key: createClientId(),
    role,
    fullName,
    shortName: buildCommitteeShortName(fullName, role),
    shortNameEdited: false,
  };
}

function toStudentRequest(row: StudentRow): StudentRequest {
  return {
    fullName: row.fullName.trim(),
    shortName: row.shortName.trim(),
    topic: row.topic.trim(),
    comment: row.comment.trim() || null,
  };
}

function toCriterionRequest(row: CriterionRow): CriterionRequest {
  return {
    title: row.title.trim(),
    description: row.description.trim() || null,
    minScore: row.minScore,
    maxScore: row.maxScore,
    weight: row.weight,
  };
}

function toCommitteeRequest(row: CommitteeRow): CommitteeSlotRequest {
  return {
    role: row.role,
    fullName: row.fullName.trim(),
    shortName: row.shortName.trim(),
  };
}

function normalizeNumber(value: number | string | null, fallback: number) {
  if (value === null) {
    return fallback;
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return fallback;
  }

  return numberValue;
}

function normalizeImportText(text: string) {
  return text.replace(/\r\n/g, '\n').trim();
}

function createClientId() {
  return crypto.randomUUID();
}