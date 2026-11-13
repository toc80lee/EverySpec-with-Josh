import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Layers,
  Loader2,
  Mic,
  MicOff,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import {
  MeetingTranscriptSegment,
  ProgramSpec,
  ProjectMeetingMinute,
  SapModule,
  SapProject,
} from '../types/sap';
import { CurrentUser } from '../utils/authStorage';
import { COMMON_PROJECT_CODE, TEMP_PROJECT_CODE } from '../utils/projectStorage';
import { formatNowDateTime, saveMeetingMinute } from '../utils/meetingStorage';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { MarkdownFieldEditor } from './MarkdownFieldEditor';
import {
  SampleRecommendationResult,
  cloneAndApplyCommonSampleSpine,
  requestAiFullSpecDraft,
  requestAiMeetingMinutes,
  requestAiSampleRecommendation,
} from '../utils/aiLogicGenerator';
import { SAMPLE_SPECS } from '../data/sampleSpecs';

const SAP_MODULES: SapModule[] = ['SD', 'MM', 'FI', 'CO', 'PP', 'HR', 'QM', 'PM', 'BC', 'CM'];

const SAMPLE_MEETING_PRESETS = [
  {
    label: 'SD 헤더-품목 출하 현황 (02)',
    speaker: '현업 영업 PM',
    text:
      '영업팀 주간 회의입니다. 영업조직과 전표일자, 고객코드로 판매오더 헤더 목록을 먼저 조회하고, 상단 그리드에서 특정 판매오더 행을 클릭하면 하단에 해당 오더의 품목별 납품 수량과 미출하 잔량이 바로 연동되어 보이게 해주세요. 헤더에는 상태 신호등과 VA03 드릴다운, 일괄 출하전기 버튼이 필요합니다.',
  },
  {
    label: 'CO 코스트센터 계층 트리 (03)',
    speaker: '관리회계 담당',
    text:
      '원가관리 계층 리포트 요건 정리합니다. 관리회계영역과 회계연도, 기간을 필수 조회 조건으로 두고 코스트센터 그룹 상하위 계층 구조를 트리 ALV 형태로 펼쳐서 보고 싶습니다. 노드별로 계획금액, 실적금액, 차이금액 소계가 자동 합산되어야 합니다.',
  },
  {
    label: 'MM 발주·납기 모니터링 (01)',
    speaker: '구매팀 수석',
    text:
      '구매오더 납기 지연 모니터링 화면을 단일 ALV 그리드로 만들고 싶습니다. 회사코드, 플랜트, 발주일자, 공급업체를 조회 조건으로 두고 미입고 건만 필터링하는 라디오버튼을 추가해 주세요. 지연 건은 빨간불 신호등을 표시하고 ME23N 드릴다운과 입고처리 툴바 버튼을 넣고 싶습니다.',
  },
  {
    label: 'FI 월별 계정 피벗 분석 (04)',
    speaker: '재무결산 팀장',
    text:
      'ACDOCA 전표 데이터를 기준으로 회사코드별, 계정과목별, 월별 금액을 행과 열로 자유롭게 교차 집계하는 다차원 피벗 분석 화면이 필요합니다. 기간별 증감 비교가 한눈에 들어오도록 구성해 주세요.',
  },
];

const SAMPLE_TYPE_META: Record<
  '01' | '02' | '03' | '04',
  { sampleId: string; title: string; subtitle: string }
> = {
  '01': {
    sampleId: 'ZRALV0010',
    title: '01 · Single ALV Grid',
    subtitle: '단일 목록 조회, 상태 신호등, 핫스팟 드릴다운, 커스텀 툴바',
  },
  '02': {
    sampleId: 'ZRALV0020',
    title: '02 · Master-Detail 2-Grid',
    subtitle: '상단 헤더 선택 시 하단 품목(Item) 그리드 실시간 연동',
  },
  '03': {
    sampleId: 'ZRALV0030',
    title: '03 · Tree ALV Grid',
    subtitle: '상하위 계층 트리 전개 및 노드별 소계/차이 집계',
  },
  '04': {
    sampleId: 'ZRALV0040',
    title: '04 · Pivot Browser',
    subtitle: 'CDS View / ACDOCA 기반 다차원 행·열 교차 집계 분석',
  },
};

type WizardStep = 1 | 2 | 3 | 4;
type ConfirmationGate = null | 'gate1_minutes' | 'gate2_recommend' | 'gate3_generate' | 'gate4_save';

interface MeetingSpecWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: CurrentUser;
  accessibleProjects: SapProject[];
  defaultProjectCode: string;
  existingProgramIds: string[];
  initialMinute?: ProjectMeetingMinute | null;
  startInSpecGen?: boolean;
  onMinutesSaved: () => void;
  onSpecFinalized: (spec: ProgramSpec, savedMinute: ProjectMeetingMinute) => void;
}

export const MeetingSpecWizardModal: React.FC<MeetingSpecWizardModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  accessibleProjects,
  defaultProjectCode,
  existingProgramIds,
  initialMinute,
  startInSpecGen = false,
  onMinutesSaved,
  onSpecFinalized,
}) => {
  const nonCommonProjects = useMemo(
    () => accessibleProjects.filter((p) => p.code !== COMMON_PROJECT_CODE),
    [accessibleProjects]
  );

  const resolveSafeTargetProject = (code?: string) => {
    const clean = (code || '').trim().toUpperCase();
    if (clean && clean !== COMMON_PROJECT_CODE && nonCommonProjects.some((p) => p.code === clean)) {
      return clean;
    }
    return nonCommonProjects.find((p) => p.code !== TEMP_PROJECT_CODE)?.code || TEMP_PROJECT_CODE;
  };

  // Wizard core state
  const [minuteId, setMinuteId] = useState<string>(() => `mtg-${Date.now()}`);
  const [createdAt, setCreatedAt] = useState<string>(() => formatNowDateTime());
  const [step, setStep] = useState<WizardStep>(1);
  const [gate, setGate] = useState<ConfirmationGate>(null);
  const [targetProjectCode, setTargetProjectCode] = useState<string>(() =>
    resolveSafeTargetProject(defaultProjectCode)
  );

  // Step 1: Recording & segments
  const [speakerName, setSpeakerName] = useState<string>('현업 담당자');
  const [segments, setSegments] = useState<MeetingTranscriptSegment[]>([]);
  const [manualNoteInput, setManualNoteInput] = useState<string>('');
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);

  // Step 2: Structured minutes & enrichment
  const [meetingTitle, setMeetingTitle] = useState<string>('신규 프로그램 설계 회의');
  const [minutesMarkdown, setMinutesMarkdown] = useState<string>('');
  const [supplementalNotes, setSupplementalNotes] = useState<string>('');
  const [isProcessingAi, setIsProcessingAi] = useState<boolean>(false);
  const [aiFeedbackMsg, setAiFeedbackMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Step 3: Recommendation & Program ID confirmation
  const [recommendation, setRecommendation] = useState<SampleRecommendationResult | null>(null);
  const [selectedSampleType, setSelectedSampleType] = useState<'01' | '02' | '03' | '04'>('01');
  const [selectedModule, setSelectedModule] = useState<SapModule>('SD');
  const [programId, setProgramId] = useState<string>('ZR_SD_MON_10');
  const [tcode, setTcode] = useState<string>('ZSD010');
  const [programTitle, setProgramTitle] = useState<string>('신규 ALV 프로그램');

  // Step 4: Generated spec preview
  const [generatedSpec, setGeneratedSpec] = useState<ProgramSpec | null>(null);
  const [detectedTables, setDetectedTables] = useState<string[]>([]);
  const [previewTab, setPreviewTab] = useState<'overview' | 'fields' | 'flow'>('overview');

  // Initialize / hydrate when modal opens or initialMinute changes
  useEffect(() => {
    if (!isOpen) return;
    setGate(null);
    setErrorMsg(null);
    setAiFeedbackMsg(null);
    setPreviewTab('overview');

    if (initialMinute) {
      setMinuteId(initialMinute.id);
      setCreatedAt(initialMinute.created_at);
      setTargetProjectCode(resolveSafeTargetProject(initialMinute.project_code));
      setSegments(initialMinute.segments || []);
      setMeetingTitle(initialMinute.title || '신규 프로그램 설계 회의');
      setMinutesMarkdown(initialMinute.minutes_markdown || '');
      setSupplementalNotes(initialMinute.supplemental_notes || '');
      setSelectedSampleType(initialMinute.recommended_sample_type || '01');
      setSelectedModule(initialMinute.suggested_module || 'SD');
      setProgramId(initialMinute.suggested_program_id || 'ZR_SD_MON_10');
      setTcode(initialMinute.suggested_tcode || 'ZSD010');
      setProgramTitle(initialMinute.suggested_title || initialMinute.title || '신규 ALV 프로그램');
      setGeneratedSpec(null);

      if (initialMinute.recommended_sample_type && initialMinute.suggested_program_id) {
        setRecommendation({
          recommendedSampleType: initialMinute.recommended_sample_type,
          confidenceReason:
            initialMinute.recommendation_reason ||
            '저장된 회의록 분석 결과 추천된 COMMON 샘플 유형입니다.',
          suggestedModule: initialMinute.suggested_module || 'SD',
          suggestedProgramId: initialMinute.suggested_program_id,
          suggestedTcode: initialMinute.suggested_tcode || 'ZSD010',
          suggestedTitle: initialMinute.suggested_title || initialMinute.title,
          requirementPrompt: initialMinute.minutes_markdown,
          alternatives: Object.entries(SAMPLE_TYPE_META).map(([k, v]) => ({
            sampleType: k as '01' | '02' | '03' | '04',
            sampleProgramId: v.sampleId,
            label: v.title,
            fitSummary: v.subtitle,
          })),
          source: 'ai',
        });
        setStep(3);
      } else if (initialMinute.minutes_markdown?.trim()) {
        if (startInSpecGen) {
          setStep(2);
          setIsProcessingAi(true);
          const safeProj = resolveSafeTargetProject(initialMinute.project_code);
          const projObj = nonCommonProjects.find((p) => p.code === safeProj);
          requestAiSampleRecommendation({
            minutesMarkdown: initialMinute.minutes_markdown.trim(),
            projectName: projObj?.name || safeProj,
            existingProgramIds,
          })
            .then((res) => {
              setRecommendation(res);
              setSelectedSampleType(res.recommendedSampleType);
              setSelectedModule(res.suggestedModule);
              setProgramId(res.suggestedProgramId);
              setTcode(res.suggestedTcode);
              setProgramTitle(res.suggestedTitle);
              setStep(3);
              setAiFeedbackMsg(
                `회의록을 분석해 COMMON 샘플 유형 ${res.recommendedSampleType} (${SAMPLE_TYPE_META[res.recommendedSampleType].sampleId})을(를) 추천했습니다. 확인 후 스펙을 생성하세요.`
              );
            })
            .catch((err: any) => {
              setErrorMsg(err?.message || '샘플 유형 추천 중 오류가 발생했습니다.');
            })
            .finally(() => {
              setIsProcessingAi(false);
            });
        } else {
          setStep(2);
        }
      } else {
        setStep(1);
      }
    } else {
      setMinuteId(`mtg-${Date.now()}`);
      setCreatedAt(formatNowDateTime());
      setTargetProjectCode(resolveSafeTargetProject(defaultProjectCode));
      setSegments([]);
      setManualNoteInput('');
      setMeetingTitle('신규 프로그램 설계 회의');
      setMinutesMarkdown('');
      setSupplementalNotes('');
      setRecommendation(null);
      setSelectedSampleType('01');
      setSelectedModule('SD');
      setProgramId('ZR_SD_MON_10');
      setTcode('ZSD010');
      setProgramTitle('신규 ALV 프로그램');
      setGeneratedSpec(null);
      setStep(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialMinute?.id, defaultProjectCode, startInSpecGen]);

  const appendSegment = (
    text: string,
    kind: 'voice' | 'supplement' | 'note' = 'voice',
    speaker?: string
  ) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const nowTime = new Date().toTimeString().slice(0, 8);
    const seg: MeetingTranscriptSegment = {
      id: `seg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: nowTime,
      speaker: speaker || speakerName || currentUser.name,
      text: trimmed,
      kind,
    };
    setSegments((prev) => [...prev, seg]);
  };

  // Primary meeting voice hook (Step 1)
  const mainVoice = useVoiceInput({
    lang: 'ko-KR',
    onResult: (finalText) => {
      appendSegment(finalText, 'voice', speakerName);
    },
  });

  // Supplemental voice hook (Step 2)
  const supplementVoice = useVoiceInput({
    lang: 'ko-KR',
    onResult: (finalText) => {
      appendSegment(finalText, 'supplement', currentUser.name);
      setSupplementalNotes((prev) => (prev.trim() ? `${prev.trim()}\n${finalText}` : finalText));
    },
  });

  // Recording elapsed timer
  useEffect(() => {
    if (!mainVoice.isListening) {
      setRecordingSeconds(0);
      return;
    }
    const timer = window.setInterval(() => {
      setRecordingSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [mainVoice.isListening]);

  // Stop active microphones when modal closes
  const mainVoiceRef = useRef(mainVoice);
  const suppVoiceRef = useRef(supplementVoice);
  mainVoiceRef.current = mainVoice;
  suppVoiceRef.current = supplementVoice;

  useEffect(() => {
    if (!isOpen) {
      if (mainVoiceRef.current.isListening) mainVoiceRef.current.stopListening();
      if (suppVoiceRef.current.isListening) suppVoiceRef.current.stopListening();
    }
  }, [isOpen]);

  const isDuplicateProgramId = useMemo(() => {
    const clean = programId.trim().toUpperCase();
    return Boolean(clean) && existingProgramIds.some((id) => id.toUpperCase() === clean);
  }, [programId, existingProgramIds]);

  if (!isOpen) return null;

  const rawTranscriptText = segments
    .map((s) => `[${s.timestamp}] ${s.speaker ? `${s.speaker}: ` : ''}${s.text}`)
    .join('\n');

  const formatDuration = (sec: number) => {
    const mm = String(Math.floor(sec / 60)).padStart(2, '0');
    const ss = String(sec % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const persistProgress = (
    overrides: Partial<ProjectMeetingMinute> = {}
  ): ProjectMeetingMinute => {
    const record: ProjectMeetingMinute = {
      id: minuteId,
      project_code: targetProjectCode,
      title: meetingTitle.trim() || '신규 프로그램 설계 회의',
      created_at: createdAt,
      updated_at: formatNowDateTime(),
      author: initialMinute?.author || currentUser.name,
      status:
        overrides.status ||
        (generatedSpec
          ? 'spec_generated'
          : recommendation
          ? 'recommended'
          : minutesMarkdown.trim()
          ? 'minutes_ready'
          : 'recording'),
      segments,
      raw_transcript: rawTranscriptText,
      supplemental_notes: supplementalNotes,
      minutes_markdown: minutesMarkdown,
      recommended_sample_type: selectedSampleType,
      recommendation_reason: recommendation?.confidenceReason,
      suggested_module: selectedModule,
      suggested_program_id: programId,
      suggested_tcode: tcode,
      suggested_title: programTitle,
      generated_program_id: initialMinute?.generated_program_id,
      ...overrides,
    };
    saveMeetingMinute(record);
    onMinutesSaved();
    return record;
  };

  const activeTargetProject = nonCommonProjects.find((p) => p.code === targetProjectCode);

  const handleAddManualNote = () => {
    if (!manualNoteInput.trim()) return;
    appendSegment(manualNoteInput, 'note', speakerName);
    setManualNoteInput('');
  };

  // Gate 1 -> Generate Step 2 structured minutes
  const handleConfirmGenerateMinutes = async () => {
    if (mainVoice.isListening) mainVoice.stopListening();
    const combinedTranscript = rawTranscriptText.trim() || manualNoteInput.trim();
    if (!combinedTranscript) {
      setErrorMsg('녹음된 음성이나 입력된 회의 메모가 없습니다.');
      setGate(null);
      return;
    }

    setGate(null);
    setErrorMsg(null);
    setIsProcessingAi(true);
    try {
      const res = await requestAiMeetingMinutes({
        mode: 'create',
        rawTranscript: combinedTranscript,
        projectName: activeTargetProject?.name || targetProjectCode,
        targetRelease: activeTargetProject?.target_sap_release || 'SAP S/4HANA 2023',
      });
      setMeetingTitle(res.title);
      setMinutesMarkdown(res.minutesMarkdown);
      setSelectedModule(res.detectedModule);
      setStep(2);
      setAiFeedbackMsg(
        res.source === 'ai'
          ? 'AI가 회의 내용을 바탕으로 구조화된 SAP 회의록을 작성했습니다. 수정 및 보충 후 확정해 주세요.'
          : '회의록 초안이 구성되었습니다. 내용을 보완한 뒤 다음 단계로 진행해 주세요.'
      );
      persistProgress({
        title: res.title,
        minutes_markdown: res.minutesMarkdown,
        suggested_module: res.detectedModule,
        status: 'minutes_ready',
      });
    } catch (err: any) {
      setErrorMsg(err?.message || '회의록 생성 중 오류가 발생했습니다.');
    } finally {
      setIsProcessingAi(false);
    }
  };

  // Step 2: Enrich existing minutes with supplemental recording / text
  const handleEnrichMinutes = async () => {
    if (supplementVoice.isListening) supplementVoice.stopListening();
    if (!supplementalNotes.trim()) {
      setErrorMsg('추가 보충 녹음 또는 텍스트를 입력한 뒤 반영해 주세요.');
      return;
    }
    setErrorMsg(null);
    setIsProcessingAi(true);
    try {
      const res = await requestAiMeetingMinutes({
        mode: 'enrich',
        rawTranscript: rawTranscriptText,
        existingMinutes: minutesMarkdown,
        supplementalNotes,
        projectName: activeTargetProject?.name || targetProjectCode,
        targetRelease: activeTargetProject?.target_sap_release || 'SAP S/4HANA 2023',
      });
      setMinutesMarkdown(res.minutesMarkdown);
      if (res.title) setMeetingTitle(res.title);
      setSelectedModule(res.detectedModule);
      setSupplementalNotes('');
      setAiFeedbackMsg('추가 녹음 및 보충 내용이 회의록 본문에 통합 반영되었습니다.');
      persistProgress({
        title: res.title || meetingTitle,
        minutes_markdown: res.minutesMarkdown,
        supplemental_notes: '',
        suggested_module: res.detectedModule,
        status: 'minutes_ready',
      });
    } catch (err: any) {
      setErrorMsg(err?.message || '보충 내용 반영 중 오류가 발생했습니다.');
    } finally {
      setIsProcessingAi(false);
    }
  };

  // Gate 2 -> Recommend COMMON Sample Type (Step 3)
  const handleConfirmRecommendSample = async () => {
    if (supplementVoice.isListening) supplementVoice.stopListening();
    const combinedMinutes = supplementalNotes.trim()
      ? `${minutesMarkdown.trim()}\n\n### 추가 보충 사항\n${supplementalNotes.trim()}`
      : minutesMarkdown.trim();

    if (!combinedMinutes) {
      setErrorMsg('회의록 본문이 비어 있어 샘플 유형을 추천할 수 없습니다.');
      setGate(null);
      return;
    }

    setGate(null);
    setErrorMsg(null);
    setIsProcessingAi(true);
    try {
      const res = await requestAiSampleRecommendation({
        minutesMarkdown: combinedMinutes,
        projectName: activeTargetProject?.name || targetProjectCode,
        existingProgramIds,
      });
      setMinutesMarkdown(combinedMinutes);
      if (supplementalNotes.trim()) setSupplementalNotes('');
      setRecommendation(res);
      setSelectedSampleType(res.recommendedSampleType);
      setSelectedModule(res.suggestedModule);
      setProgramId(res.suggestedProgramId);
      setTcode(res.suggestedTcode);
      setProgramTitle(res.suggestedTitle);
      setStep(3);
      setAiFeedbackMsg(
        `AI가 COMMON 샘플 유형 ${res.recommendedSampleType} (${SAMPLE_TYPE_META[res.recommendedSampleType].sampleId}) 및 추천 ID를 제안했습니다.`
      );
      persistProgress({
        minutes_markdown: combinedMinutes,
        supplemental_notes: '',
        recommended_sample_type: res.recommendedSampleType,
        recommendation_reason: res.confidenceReason,
        suggested_module: res.suggestedModule,
        suggested_program_id: res.suggestedProgramId,
        suggested_tcode: res.suggestedTcode,
        suggested_title: res.suggestedTitle,
        status: 'recommended',
      });
    } catch (err: any) {
      setErrorMsg(err?.message || '샘플 유형 추천 중 오류가 발생했습니다.');
    } finally {
      setIsProcessingAi(false);
    }
  };

  // Gate 3 -> Clone COMMON sample spine & generate full ProgramSpec (Step 4)
  const handleConfirmGenerateFullSpec = async () => {
    const cleanPid = programId.trim().toUpperCase();
    if (!cleanPid || (!cleanPid.startsWith('Z') && !cleanPid.startsWith('Y'))) {
      setErrorMsg('Program ID는 Z 또는 Y로 시작하는 SAP 고객 네임스페이스여야 합니다.');
      setGate(null);
      return;
    }
    if (isDuplicateProgramId) {
      setErrorMsg(`이미 등록된 Program ID('${cleanPid}')입니다. 다른 ID를 입력해 주세요.`);
      setGate(null);
      return;
    }

    setGate(null);
    setErrorMsg(null);
    setIsProcessingAi(true);
    try {
      const promptPayload = `[프로젝트]: ${activeTargetProject?.name || targetProjectCode}
[프로그램 제목]: ${programTitle}
[선택된 COMMON 샘플 유형]: ${selectedSampleType} (${SAMPLE_TYPE_META[selectedSampleType].sampleId} - ${SAMPLE_TYPE_META[selectedSampleType].title})

[확정된 설계 회의록]
${minutesMarkdown}`;

      const draft = await requestAiFullSpecDraft({
        requirementPrompt: promptPayload,
        module: selectedModule,
        sampleType: selectedSampleType,
        targetSapRelease: activeTargetProject?.target_sap_release || 'SAP S/4HANA 2023',
        programId: cleanPid,
        tcode: tcode.trim().toUpperCase() || `Z${selectedModule}010`,
      });

      const finalSpec = cloneAndApplyCommonSampleSpine({
        generatedSpec: draft.spec,
        sampleType: selectedSampleType,
        targetProjectCode,
        programId: cleanPid,
        tcode: tcode.trim().toUpperCase() || draft.spec.tcode,
        title: programTitle.trim() || draft.spec.title,
        module: selectedModule,
        author: currentUser.name,
        targetSapRelease: activeTargetProject?.target_sap_release || 'SAP S/4HANA 2023',
      });

      setGeneratedSpec(finalSpec);
      setDetectedTables(draft.detectedTables);
      setStep(4);
      setAiFeedbackMsg(
        `COMMON '${SAMPLE_TYPE_META[selectedSampleType].sampleId}' 구조를 복제하여 '${finalSpec.program_id}' 전체 사양서 구성을 완료했습니다.`
      );
      persistProgress({
        recommended_sample_type: selectedSampleType,
        suggested_module: selectedModule,
        suggested_program_id: finalSpec.program_id,
        suggested_tcode: finalSpec.tcode,
        suggested_title: finalSpec.title,
      });
    } catch (err: any) {
      setErrorMsg(err?.message || '사양서 구성 중 오류가 발생했습니다.');
    } finally {
      setIsProcessingAi(false);
    }
  };

  // Gate 4 -> Save final spec & jump to Dual View detail editor
  const handleConfirmRegisterAndOpen = () => {
    if (!generatedSpec) return;
    setGate(null);
    const savedMinute = persistProgress({
      status: 'spec_generated',
      generated_program_id: generatedSpec.program_id,
      recommended_sample_type: selectedSampleType,
      suggested_module: selectedModule,
      suggested_program_id: generatedSpec.program_id,
      suggested_tcode: generatedSpec.tcode,
      suggested_title: generatedSpec.title,
    });
    onSpecFinalized(generatedSpec, savedMinute);
  };

  const baselineSample =
    SAMPLE_SPECS.find((s) => (s.sample_type || '01') === selectedSampleType) || SAMPLE_SPECS[0];

  return (
    <div className="h-full flex flex-col bg-slate-50 text-slate-900 overflow-hidden">
      {/* Page Header & 4-Step Progress Indicator */}
      <header className="px-6 py-4 bg-white border-b border-slate-200 shrink-0">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-mono font-semibold text-blue-700 flex items-center gap-2">
                <span>AI MEETING-TO-SPEC WIZARD</span>
                <span aria-hidden="true">·</span>
                <span>대상 프로젝트: {targetProjectCode}</span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
                회의 녹음 기반 원스탑 SAP 프로그램 사양서 설계
              </h1>
            </div>

            <button
              type="button"
              onClick={() => {
                persistProgress();
                onClose();
              }}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
              title="임시 저장 후 오버뷰로 돌아가기"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>오버뷰로 돌아가기 (임시 저장)</span>
            </button>
          </div>

          {/* Stepper Bar */}
          <nav className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2" aria-label="설계 진행 단계">
            {[
              { num: 1 as WizardStep, label: '1. 회의 녹음·입력' },
              { num: 2 as WizardStep, label: '2. 회의록 검토·보충' },
              { num: 3 as WizardStep, label: '3. COMMON 유형 확정' },
              { num: 4 as WizardStep, label: '4. 사양서 구성·등록' },
            ].map((item) => {
              const isActive = step === item.num;
              const isDone =
                (item.num === 1 && Boolean(minutesMarkdown.trim())) ||
                (item.num === 2 && Boolean(recommendation)) ||
                (item.num === 3 && Boolean(generatedSpec)) ||
                step > item.num;
              const canJump =
                item.num === 1 ||
                (item.num === 2 && Boolean(minutesMarkdown.trim())) ||
                (item.num === 3 && Boolean(recommendation)) ||
                (item.num === 4 && Boolean(generatedSpec));

              return (
                <button
                  key={item.num}
                  type="button"
                  disabled={!canJump || isProcessingAi}
                  onClick={() => {
                    if (canJump) {
                      setGate(null);
                      setStep(item.num);
                    }
                  }}
                  className={`px-3.5 py-2.5 rounded-lg text-left text-xs font-semibold transition-all border flex items-center justify-between gap-2 ${
                    isActive
                      ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                      : isDone
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100 cursor-pointer'
                      : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span className="truncate">{item.label}</span>
                  {isDone && !isActive && <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600" />}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Scrollable Step Body */}
      <div className="flex-1 overflow-y-auto bg-slate-50">
        <div className="max-w-6xl mx-auto px-6 py-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMsg}</div>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="text-rose-500 hover:text-rose-800 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {aiFeedbackMsg && (
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{aiFeedbackMsg}</div>
              <button
                type="button"
                onClick={() => setAiFeedbackMsg(null)}
                className="text-blue-500 hover:text-blue-800 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 1: RECORDING & MEETING NOTES                                 */}
          {/* ================================================================= */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      1단계. 회의 음성 녹음 및 요구사항 기록
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      회의 중 논의 내용을 실시간 녹음하거나 메모를 누적 기록하세요. 녹음 종료 후 회의록 작성 여부를 확인합니다.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <label className="text-[11px] font-semibold text-slate-600">
                      저장 프로젝트
                    </label>
                    <select
                      value={targetProjectCode}
                      onChange={(e) => setTargetProjectCode(e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 cursor-pointer"
                    >
                      {nonCommonProjects.map((proj) => (
                        <option key={proj.code} value={proj.code}>
                          {proj.code} ({proj.name})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Microphone Controls Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900 text-white">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (mainVoice.isListening) {
                          mainVoice.stopListening();
                        } else {
                          mainVoice.startListening();
                        }
                      }}
                      className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                        mainVoice.isListening
                          ? 'bg-rose-600 hover:bg-rose-700 text-white'
                          : 'bg-blue-600 hover:bg-blue-500 text-white'
                      }`}
                    >
                      {mainVoice.isListening ? (
                        <>
                          <MicOff className="w-4 h-4" />
                          <span>녹음 중지 (내용 저장)</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-4 h-4" />
                          <span>회의 녹음 시작</span>
                        </>
                      )}
                    </button>

                    <div className="text-xs">
                      {mainVoice.isListening ? (
                        <div className="flex items-center gap-2 text-rose-300 font-mono tabular-nums font-semibold">
                          <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                          <span>녹음 중 · {formatDuration(recordingSeconds)}</span>
                        </div>
                      ) : mainVoice.isTranscribing ? (
                        <div className="flex items-center gap-1.5 text-blue-300 font-medium">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>음성을 텍스트로 변환 중...</span>
                        </div>
                      ) : (
                        <span className="text-slate-300">
                          버튼을 눌러 회의 음성을 누적 기록하세요.
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">발언자:</span>
                    <input
                      type="text"
                      value={speakerName}
                      onChange={(e) => setSpeakerName(e.target.value)}
                      placeholder="발언자명"
                      className="w-28 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-md text-xs text-white focus:border-blue-400"
                    />
                  </div>
                </div>

                {mainVoice.isListening && mainVoice.transcript && (
                  <div className="px-3.5 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-center gap-2">
                    <Volume2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="italic">{mainVoice.transcript}</span>
                  </div>
                )}

                {mainVoice.errorMessage && (
                  <div className="px-3.5 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                    {mainVoice.errorMessage}
                  </div>
                )}

                {/* Preset Sample Voice Buttons for quick demo/testing */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-500">
                    마이크 미연결 환경용 · 샘플 회의 발언 빠르게 추가:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {SAMPLE_MEETING_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => appendSegment(preset.text, 'voice', preset.speaker)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 hover:border-blue-300 rounded-md text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer"
                      >
                        + {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Manual Quick Note Entry */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualNoteInput}
                    onChange={(e) => setManualNoteInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddManualNote();
                      }
                    }}
                    placeholder="회의 중 직접 메모할 요구사항이 있으면 입력 후 Enter 또는 추가 클릭..."
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddManualNote}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>메모 추가</span>
                  </button>
                </div>
              </div>

              {/* Captured Transcript Segments List */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
                  <div className="text-xs font-bold text-slate-800">
                    누적 기록된 회의 녹음 · 메모 ({segments.length}건)
                  </div>
                  {segments.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSegments([])}
                      className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
                    >
                      전체 비우기
                    </button>
                  )}
                </div>

                {segments.length === 0 ? (
                  <div className="px-6 py-10 text-center text-xs text-slate-500">
                    아직 기록된 회의 내용이 없습니다. 상단에서 <strong>회의 녹음 시작</strong>을 누르거나 샘플/직접 메모를 추가해 주세요.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                    {segments.map((seg) => (
                      <div key={seg.id} className="px-5 py-3 flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 font-mono">
                            <span>{seg.timestamp}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-sans font-semibold text-slate-700">
                              {seg.speaker || '참석자'}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>
                              {seg.kind === 'voice'
                                ? '음성 녹음'
                                : seg.kind === 'supplement'
                                ? '추가 보충'
                                : '직접 메모'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-800 mt-1 leading-relaxed whitespace-pre-wrap">
                            {seg.text}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setSegments((prev) => prev.filter((item) => item.id !== seg.id))
                          }
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer shrink-0"
                          title="항목 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 2: AI STRUCTURED MINUTES REVIEW & VOICE/TEXT ENRICHMENT      */}
          {/* ================================================================= */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      2단계. 회의록 검토 · 직접 수정 및 추가 보충
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      AI가 정리한 회의록을 자유롭게 수정하거나, 아래에서 추가 음성 녹음/텍스트를 입력해 회의록을 보충한 뒤 확정하세요.
                    </p>
                  </div>
                  <div className="text-xs font-mono font-semibold text-slate-600 shrink-0">
                    프로젝트: {targetProjectCode}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      회의록 제목
                    </label>
                    <input
                      type="text"
                      value={meetingTitle}
                      onChange={(e) => setMeetingTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      대상 프로젝트
                    </label>
                    <select
                      value={targetProjectCode}
                      onChange={(e) => setTargetProjectCode(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 cursor-pointer"
                    >
                      {nonCommonProjects.map((proj) => (
                        <option key={proj.code} value={proj.code}>
                          {proj.code} ({proj.name})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    회의록 본문 (직접 편집 및 미리보기 가능)
                  </label>
                  <MarkdownFieldEditor
                    value={minutesMarkdown}
                    onChange={setMinutesMarkdown}
                    rows={10}
                    minHeight="220px"
                    placeholder="회의록 내용을 마크다운으로 검토하고 자유롭게 수정하세요..."
                  />
                </div>
              </div>

              {/* Enrichment / Supplemental Voice & Notes Panel */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      추가 녹음 및 보충 요구사항 덧붙이기
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      빠진 업무 규칙이나 추가 조건을 음성으로 녹음하거나 텍스트로 입력한 뒤 회의록에 통합 반영할 수 있습니다.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (supplementVoice.isListening) {
                        supplementVoice.stopListening();
                      } else {
                        supplementVoice.startListening();
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      supplementVoice.isListening
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    {supplementVoice.isListening ? (
                      <>
                        <MicOff className="w-3.5 h-3.5" />
                        <span>추가 녹음 중지</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5" />
                        <span>추가 음성 녹음</span>
                      </>
                    )}
                  </button>
                </div>

                {supplementVoice.isListening && supplementVoice.transcript && (
                  <div className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800 italic">
                    {supplementVoice.transcript}
                  </div>
                )}

                {supplementVoice.errorMessage && (
                  <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                    {supplementVoice.errorMessage}
                  </div>
                )}

                <textarea
                  rows={3}
                  value={supplementalNotes}
                  onChange={(e) => setSupplementalNotes(e.target.value)}
                  placeholder="예: 추가로 거래처별 미수금 합계도 보고 싶고, 엑셀 다운로드 전 권한 체크 로직을 넣어주세요..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-blue-500"
                />

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={!supplementalNotes.trim() || isProcessingAi}
                    onClick={handleEnrichMinutes}
                    className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {isProcessingAi ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>보충 내용 반영해 회의록 재정리</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 3: COMMON SAMPLE RECOMMENDATION & PROGRAM ID EDITING         */}
          {/* ================================================================= */}
          {step === 3 && (
            <div className="space-y-5">
              {/* AI Recommendation Rationale */}
              <div className="bg-white border border-blue-200 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-blue-700 font-bold text-xs">
                    <Sparkles className="w-4 h-4" />
                    <span>AI 분석 추천 COMMON 샘플 유형</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-slate-700">
                    추천 유형: {selectedSampleType} ({SAMPLE_TYPE_META[selectedSampleType].sampleId})
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed bg-blue-50/70 border border-blue-100 rounded-lg p-3">
                  {recommendation?.confidenceReason ||
                    '회의록 요구사항을 분석하여 가장 적합한 COMMON 표준 ALV 샘플 유형을 추천했습니다.'}
                </p>

                {/* 4 Selectable COMMON Sample Type Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                  {(['01', '02', '03', '04'] as const).map((typeCode) => {
                    const meta = SAMPLE_TYPE_META[typeCode];
                    const alt = recommendation?.alternatives?.find(
                      (a) => a.sampleType === typeCode
                    );
                    const isAiTop = recommendation?.recommendedSampleType === typeCode;
                    const isChosen = selectedSampleType === typeCode;

                    return (
                      <button
                        key={typeCode}
                        type="button"
                        onClick={() => setSelectedSampleType(typeCode)}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                          isChosen
                            ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                            : 'bg-white border-slate-200 hover:border-blue-400 text-slate-800'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={`font-mono text-xs font-bold ${
                                isChosen ? 'text-blue-300' : 'text-blue-700'
                              }`}
                            >
                              {meta.sampleId}
                            </span>
                            {isAiTop && (
                              <span
                                className={`text-[10px] font-bold ${
                                  isChosen ? 'text-emerald-300' : 'text-emerald-600'
                                }`}
                              >
                                AI 추천
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-bold mt-1">{meta.title}</div>
                          <p
                            className={`text-[11px] mt-1 leading-snug ${
                              isChosen ? 'text-slate-300' : 'text-slate-500'
                            }`}
                          >
                            {alt?.fitSummary || meta.subtitle}
                          </p>
                        </div>
                        <div
                          className={`text-[11px] font-semibold pt-2 border-t ${
                            isChosen
                              ? 'border-slate-700 text-blue-300'
                              : 'border-slate-100 text-slate-500'
                          }`}
                        >
                          {isChosen ? '선택됨 · 이 구조 복제' : '클릭하여 선택'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Editable AI-Suggested Program Identifiers & Target Project */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    생성될 프로그램 기본 정보 확인 및 수정
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    COMMON 원본({baselineSample.program_id})은 보호되며, 아래 대상 프로젝트에 새로운 프로그램 ID로 복제·구성됩니다.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      대상 프로젝트 (필수 · COMMON 제외)
                    </label>
                    <select
                      value={targetProjectCode}
                      onChange={(e) => setTargetProjectCode(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 cursor-pointer"
                    >
                      {nonCommonProjects.map((proj) => (
                        <option key={proj.code} value={proj.code}>
                          {proj.code} — {proj.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      SAP 모듈
                    </label>
                    <select
                      value={selectedModule}
                      onChange={(e) => setSelectedModule(e.target.value as SapModule)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-semibold text-slate-800 cursor-pointer"
                    >
                      {SAP_MODULES.map((m) => (
                        <option key={m} value={m}>
                          {m === 'CM' ? 'CM (공통 영역)' : m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      T-Code (Z*/Y*)
                    </label>
                    <input
                      type="text"
                      value={tcode}
                      onChange={(e) =>
                        setTcode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))
                      }
                      maxLength={20}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Program ID (Z*/Y*)
                    </label>
                    <input
                      type="text"
                      value={programId}
                      onChange={(e) =>
                        setProgramId(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))
                      }
                      maxLength={30}
                      className={`w-full px-3 py-2 bg-white border rounded-lg text-xs font-mono font-bold focus:outline-none ${
                        isDuplicateProgramId
                          ? 'border-rose-500 text-rose-700'
                          : 'border-slate-300 text-slate-900 focus:border-blue-500'
                      }`}
                    />
                    {isDuplicateProgramId && (
                      <p className="text-[11px] text-rose-600 mt-1 font-medium">
                        이미 존재하는 Program ID입니다. 다른 이름을 입력해 주세요.
                      </p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      프로그램명 (Title)
                    </label>
                    <input
                      type="text"
                      value={programTitle}
                      onChange={(e) => setProgramTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 4: GENERATED SPEC PREVIEW & REGISTER TO PROJECT              */}
          {/* ================================================================= */}
          {step === 4 && generatedSpec && (
            <div className="space-y-4">
              {/* Summary Banner */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-mono font-semibold text-blue-700 flex items-center gap-2">
                    <span>{generatedSpec.project_code}</span>
                    <span aria-hidden="true">·</span>
                    <span>유형 {generatedSpec.sample_type} ({baselineSample.program_id} 복제)</span>
                    <span aria-hidden="true">·</span>
                    <span>{generatedSpec.module}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">
                    {generatedSpec.program_id} — {generatedSpec.title}
                  </h3>
                  <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-3">
                    <span>T-Code: <strong className="font-mono text-slate-800">{generatedSpec.tcode}</strong></span>
                    <span>선택화면: <strong className="font-mono tabular-nums text-slate-800">{generatedSpec.selection_params.length}</strong>개</span>
                    <span>ALV 컬럼: <strong className="font-mono tabular-nums text-slate-800">{generatedSpec.field_catalog.length}</strong>개</span>
                    {generatedSpec.item_grid && (
                      <span>Item 컬럼: <strong className="font-mono tabular-nums text-slate-800">{generatedSpec.item_grid.field_catalog.length}</strong>개</span>
                    )}
                    <span>테스트 케이스: <strong className="font-mono tabular-nums text-slate-800">{generatedSpec.test_cases.length}</strong>건</span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isProcessingAi}
                  onClick={() => setGate('gate3_generate')}
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>유형/스펙 다시 구성</span>
                </button>
              </div>

              {/* Preview Tabs */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 border-b border-slate-200 flex items-center gap-2 bg-slate-50">
                  {[
                    { id: 'overview' as const, label: '업무 목적 & 데이터 추출 로직' },
                    {
                      id: 'fields' as const,
                      label: `선택화면(${generatedSpec.selection_params.length}) & ALV 필드(${generatedSpec.field_catalog.length})`,
                    },
                    {
                      id: 'flow' as const,
                      label: `데이터 흐름 & QA 테스트(${generatedSpec.test_cases.length}) / Mock(${generatedSpec.mock_rows.length})`,
                    },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setPreviewTab(tab.id)}
                      className={`px-3.5 py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                        previewTab === tab.id
                          ? 'border-blue-600 text-blue-700'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="p-5 space-y-4">
                  {previewTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-slate-800">
                          Business Purpose (업무 목적)
                        </div>
                        <pre className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed max-h-64 overflow-y-auto">
                          {generatedSpec.business_purpose}
                        </pre>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-bold text-slate-800">
                            Data Extraction Logic (추출 및 가공 로직)
                          </div>
                          {detectedTables.length > 0 && (
                            <span className="text-[11px] font-mono text-blue-700">
                              테이블: {detectedTables.join(', ')}
                            </span>
                          )}
                        </div>
                        <pre className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed max-h-64 overflow-y-auto">
                          {generatedSpec.data_extraction_logic}
                        </pre>
                      </div>
                    </div>
                  )}

                  {previewTab === 'fields' && (
                    <div className="space-y-5">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 mb-2">
                          Selection Screen 파라미터 ({generatedSpec.selection_params.length})
                        </h4>
                        <div className="overflow-x-auto border border-slate-200 rounded-lg">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 text-slate-700 font-bold">
                              <tr>
                                <th className="px-3 py-2">블록</th>
                                <th className="px-3 py-2">구분</th>
                                <th className="px-3 py-2">파라미터명</th>
                                <th className="px-3 py-2">라벨</th>
                                <th className="px-3 py-2">참조 테이블-필드</th>
                                <th className="px-3 py-2">필수</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {generatedSpec.selection_params.map((p) => (
                                <tr key={p.id}>
                                  <td className="px-3 py-2 text-slate-600">{p.block_title || '-'}</td>
                                  <td className="px-3 py-2 font-mono text-slate-700">{p.kind}</td>
                                  <td className="px-3 py-2 font-mono font-bold text-blue-700">{p.name}</td>
                                  <td className="px-3 py-2 text-slate-800">{p.text}</td>
                                  <td className="px-3 py-2 font-mono text-slate-600">
                                    {p.ref_table ? `${p.ref_table}-${p.ref_field || ''}` : p.datatype}
                                  </td>
                                  <td className="px-3 py-2 font-mono">
                                    {p.obligatory ? 'Y' : '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-slate-800 mb-2">
                          ALV Field Catalog ({generatedSpec.field_catalog.length})
                        </h4>
                        <div className="overflow-x-auto border border-slate-200 rounded-lg">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 text-slate-700 font-bold">
                              <tr>
                                <th className="px-3 py-2">Pos</th>
                                <th className="px-3 py-2">Fieldname</th>
                                <th className="px-3 py-2">Header Text</th>
                                <th className="px-3 py-2">Type</th>
                                <th className="px-3 py-2">Key</th>
                                <th className="px-3 py-2">Hotspot / T-Code</th>
                                <th className="px-3 py-2">Sum</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {generatedSpec.field_catalog.map((f) => (
                                <tr key={f.id}>
                                  <td className="px-3 py-2 font-mono tabular-nums">{f.col_pos}</td>
                                  <td className="px-3 py-2 font-mono font-bold text-slate-900">{f.fieldname}</td>
                                  <td className="px-3 py-2 text-slate-800">{f.coltext}</td>
                                  <td className="px-3 py-2 font-mono text-slate-600">{f.datatype}</td>
                                  <td className="px-3 py-2 font-mono">{f.key ? 'X' : '-'}</td>
                                  <td className="px-3 py-2 font-mono text-blue-700">
                                    {f.hotspot ? f.drilldown_tcode || 'YES' : '-'}
                                  </td>
                                  <td className="px-3 py-2 font-mono">{f.do_sum ? 'Σ' : '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {previewTab === 'flow' && (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 mb-2">
                          QA 테스트 시나리오 ({generatedSpec.test_cases.length})
                        </h4>
                        <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
                          {generatedSpec.test_cases.map((tc) => (
                            <div key={tc.id} className="p-3 text-xs space-y-1">
                              <div className="font-bold text-slate-900">{tc.scenario}</div>
                              <div className="text-slate-600">조건: {tc.condition}</div>
                              <div className="text-blue-700 font-medium">예상 결과: {tc.expected}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {generatedSpec.data_flow?.mermaid_code && (
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 mb-1.5">
                            Data Flow 정의
                          </h4>
                          <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg text-[11px] font-mono overflow-x-auto">
                            {generatedSpec.data_flow.mermaid_code}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* EXPLICIT STEP-BY-STEP CONFIRMATION GATE BANNER                     */}
      {/* ================================================================= */}
      {gate && (
        <div className="px-6 py-4 bg-blue-50 border-t border-blue-200 shrink-0">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-900">
                <div className="font-bold">다음 단계 진행 확인</div>
                <p className="text-slate-700 mt-0.5">
                  {gate === 'gate1_minutes' &&
                    '회의 녹음·메모 입력을 종료하고, 이 내용을 바탕으로 AI가 회의록을 작성할까요?'}
                  {gate === 'gate2_recommend' &&
                    '작성·보충된 회의록을 확정 저장하고, 적합한 COMMON 샘플 프로그램 유형을 추천받을까요?'}
                  {gate === 'gate3_generate' &&
                    `선택한 COMMON 샘플(유형 ${selectedSampleType} · ${SAMPLE_TYPE_META[selectedSampleType].sampleId}) 구조를 복제해 '${programId}' 사양서를 AI로 구성할까요?`}
                  {gate === 'gate4_save' &&
                    `구성된 '${generatedSpec?.program_id}' 사양서를 '${targetProjectCode}' 프로젝트에 등록하고 상세 편집·시뮬레이션 화면으로 이동할까요?`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setGate(null)}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                아니오 · 더 수정하기
              </button>
              <button
                type="button"
                disabled={isProcessingAi}
                onClick={() => {
                  if (gate === 'gate1_minutes') handleConfirmGenerateMinutes();
                  else if (gate === 'gate2_recommend') handleConfirmRecommendSample();
                  else if (gate === 'gate3_generate') handleConfirmGenerateFullSpec();
                  else if (gate === 'gate4_save') handleConfirmRegisterAndOpen();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>
                  {gate === 'gate1_minutes' && '예, 회의록 작성'}
                  {gate === 'gate2_recommend' && '예, 샘플 유형 추천'}
                  {gate === 'gate3_generate' && '예, 사양서 구성'}
                  {gate === 'gate4_save' && '예, 등록 후 상세 화면 열기'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Action Bar */}
      <footer className="px-6 py-3.5 bg-white border-t border-slate-200 shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                type="button"
                disabled={isProcessingAi}
                onClick={() => {
                  setGate(null);
                  setStep((s) => (s > 1 ? ((s - 1) as WizardStep) : 1));
                }}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>이전 단계</span>
              </button>
            )}
            <button
              type="button"
              disabled={isProcessingAi}
              onClick={() => {
                persistProgress();
                onClose();
              }}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              임시 저장 후 오버뷰로
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            {isProcessingAi && (
              <div className="text-xs font-semibold text-blue-700 flex items-center gap-1.5 mr-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>AI 분석 및 구성 중...</span>
              </div>
            )}

            {step === 1 && (
              <button
                type="button"
                disabled={isProcessingAi || (segments.length === 0 && !manualNoteInput.trim())}
                onClick={() => setGate('gate1_minutes')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <span>회의 마침 · 회의록 작성</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 2 && (
              <button
                type="button"
                disabled={isProcessingAi || !minutesMarkdown.trim()}
                onClick={() => setGate('gate2_recommend')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <span>회의록 완료 · 샘플 유형 추천받기</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 3 && (
              <button
                type="button"
                disabled={isProcessingAi || !programId.trim() || isDuplicateProgramId}
                onClick={() => setGate('gate3_generate')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>선택 유형으로 AI 사양서 구성</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 4 && (
              <button
                type="button"
                disabled={isProcessingAi || !generatedSpec}
                onClick={() => setGate('gate4_save')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>프로젝트에 등록 & 상세 편집 이동</span>
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};
