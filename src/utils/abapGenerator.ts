import { ProgramSpec, AlvField, SelectionParameter } from '../types/sap';

export function generateFullAbapSource(spec: ProgramSpec): string {
  const dateStr = spec.created_date.replace(/-/g, '.');
  const progId = spec.program_id.toUpperCase();
  const tcode = spec.tcode.toUpperCase();
  const title = spec.title;

  // Collect distinct tables for TABLES statement
  const tablesSet = new Set<string>();
  spec.selection_params.forEach(p => {
    if (p.ref_table && p.ref_table !== 'SY') tablesSet.add(p.ref_table);
  });
  spec.field_catalog.forEach(f => {
    if (f.ref_table && f.ref_table !== 'ALV') tablesSet.add(f.ref_table);
  });
  const tablesDecl = Array.from(tablesSet).join(', ');

  // Build Field Structure for ty_alv
  const fieldDefs = spec.field_catalog.map(f => {
    if (f.fieldname === 'CHECKBOX') {
      return `    check_box     TYPE c LENGTH 1,         " ALV 행 선택 플래그`;
    }
    if (f.fieldname === 'LIGHTS') {
      return `    lights        TYPE c LENGTH 1,         " 예외 상태 신호등 (1:녹, 2:황, 3:적)`;
    }
    if (f.ref_table && f.ref_field) {
      return `    ${f.fieldname.toLowerCase().padEnd(14)}TYPE ${f.ref_table.toLowerCase()}-${f.ref_field.toLowerCase()},    " ${f.coltext}`;
    }
    const typeMapping: Record<string, string> = {
      CHAR: `TYPE c LENGTH ${f.outputlen || 10}`,
      NUMC: `TYPE n LENGTH ${f.outputlen || 10}`,
      DATS: `TYPE d`,
      TIMS: `TYPE t`,
      CURR: `TYPE p LENGTH 8 DECIMALS 2`,
      DEC: `TYPE p LENGTH 8 DECIMALS 2`,
      UNIT: `TYPE c LENGTH 3`,
      INT4: `TYPE i`,
      STRING: `TYPE string`,
    };
    return `    ${f.fieldname.toLowerCase().padEnd(14)}${typeMapping[f.datatype] || 'TYPE string'},       " ${f.coltext}`;
  }).join('\n');

  // Build Selection Screen
  const selScreenCode = spec.selection_params.map(p => {
    const isParam = p.kind === 'PARAMETER';
    const name = p.name.toLowerCase();
    const oblig = p.obligatory ? ' OBLIGATORY' : '';
    const def = p.default_val ? ` DEFAULT '${p.default_val}'` : '';
    const mem = p.memory_id ? ` MEMORY ID ${p.memory_id}` : '';

    const abapType =
      p.datatype === 'DATS'
        ? 'TYPE d'
        : p.datatype === 'TIMS'
        ? 'TYPE t'
        : p.datatype === 'INT4'
        ? 'TYPE i'
        : p.datatype === 'NUMC'
        ? `TYPE n LENGTH ${p.length || 10}`
        : p.datatype === 'CURR' || p.datatype === 'DEC'
        ? `TYPE p LENGTH 8 DECIMALS 2`
        : p.datatype === 'STRING'
        ? 'TYPE string'
        : `TYPE c LENGTH ${p.length || 10}`;

    if (isParam) {
      if (p.ref_table && p.ref_field) {
        return `  PARAMETERS: ${name} TYPE ${p.ref_table.toLowerCase()}-${p.ref_field.toLowerCase()}${oblig}${def}${mem}.    " ${p.text}`;
      }
      return `  PARAMETERS: ${name} ${abapType}${oblig}${def}${mem}.    " ${p.text}`;
    } else {
      if (p.ref_table && p.ref_field) {
        return `  SELECT-OPTIONS: ${name} FOR ${p.ref_table.toLowerCase()}-${p.ref_field.toLowerCase()}${oblig}${def}${mem}.    " ${p.text}`;
      }
      const forTarget = p.datatype === 'DATS' ? 'sy-datum' : `${name}_val`;
      const decl = p.datatype === 'DATS' ? '' : `  DATA: ${name}_val ${abapType}.\n`;
      return `${decl}  SELECT-OPTIONS: ${name} FOR ${forTarget}${oblig}${def}.    " ${p.text}`;
    }
  }).join('\n');

  // Build Field Catalog Macro / Logic
  const fcatLines = spec.field_catalog.map(f => {
    return `  _set_fcat '${f.fieldname.toUpperCase()}' '${f.coltext}' '${f.key ? 'X' : ' '}' '${f.hotspot ? 'X' : ' '}' '${f.checkbox ? 'X' : ' '}' '${f.edit ? 'X' : ' '}' '${f.do_sum ? 'X' : ' '}' '${f.just}' '${f.outputlen}' '${f.emphasize || ' '}'.`;
  }).join('\n');

  // Build Layout Statements (LVC_S_LAYO - 23 standard fields, RFQ v1.10 Page 2-4)
  const layoLinesArr: string[] = ['  CLEAR gs_layo.'];
  if (spec.layout?.grid_title || spec.title) {
    layoLinesArr.push(`  gs_layo-grid_title = '${spec.layout?.grid_title || spec.title}'.`);
  }
  if (spec.layout?.smalltitle) layoLinesArr.push(`  gs_layo-smalltitle = 'X'.`);
  layoLinesArr.push(`  gs_layo-zebra      = '${spec.layout?.zebra ? 'X' : ' '}'.`);
  layoLinesArr.push(`  gs_layo-cwidth_opt = '${spec.layout?.cwidth_opt ? 'X' : ' '}'.`);
  layoLinesArr.push(`  gs_layo-sel_mode   = '${spec.layout?.sel_mode || 'A'}'.`);
  if (spec.layout?.no_headers) layoLinesArr.push(`  gs_layo-no_headers = 'X'.`);
  if (spec.layout?.no_hgridln) layoLinesArr.push(`  gs_layo-no_hgridln = 'X'.`);
  if (spec.layout?.no_vgridln) layoLinesArr.push(`  gs_layo-no_vgridln = 'X'.`);
  if (spec.layout?.no_toolbar) layoLinesArr.push(`  gs_layo-no_toolbar = 'X'.`);
  if (spec.layout?.no_rowmark) layoLinesArr.push(`  gs_layo-no_rowmark = 'X'.`);
  if (spec.layout?.sgl_clk_hd) layoLinesArr.push(`  gs_layo-sgl_clk_hd = 'X'.`);
  if (spec.layout?.no_merging) layoLinesArr.push(`  gs_layo-no_merging = 'X'.`);
  if (spec.layout?.keyhot)     layoLinesArr.push(`  gs_layo-keyhot     = 'X'.`);
  if (spec.layout?.totals_bef) layoLinesArr.push(`  gs_layo-totals_bef = 'X'.`);
  if (spec.layout?.no_totline) layoLinesArr.push(`  gs_layo-no_totline = 'X'.`);
  if (spec.layout?.no_totarr)  layoLinesArr.push(`  gs_layo-no_totarr  = 'X'.`);
  if (spec.layout?.no_totexp)  layoLinesArr.push(`  gs_layo-no_totexp  = 'X'.`);
  if (spec.layout?.numc_total) layoLinesArr.push(`  gs_layo-numc_total = 'X'.`);
  if (spec.layout?.detailinit) layoLinesArr.push(`  gs_layo-detailinit = 'X'.`);
  if (spec.layout?.detailtitl) layoLinesArr.push(`  gs_layo-detailtitl = '${spec.layout.detailtitl}'.`);
  if (spec.layout?.info_fname) layoLinesArr.push(`  gs_layo-info_fname = '${spec.layout.info_fname}'.`);
  if (spec.layout?.ctab_fname) layoLinesArr.push(`  gs_layo-ctab_fname = '${spec.layout.ctab_fname}'.`);
  if (spec.layout?.stylefname) layoLinesArr.push(`  gs_layo-stylefname = '${spec.layout.stylefname}'.`);
  if (spec.layout?.excp_fname) {
    layoLinesArr.push(`  gs_layo-excp_fname = '${spec.layout.excp_fname}'.`);
    layoLinesArr.push(`  gs_layo-excp_led   = 'X'.`);
  }
  if (spec.layout?.box_fname) {
    layoLinesArr.push(`  gs_layo-box_fname  = '${spec.layout.box_fname}'.`);
  }
  const layoutStatements = layoLinesArr.join('\n');

  // Build Hotspot Handlers
  const hotspotBranches = spec.field_catalog
    .filter(f => f.hotspot && f.drilldown_tcode)
    .map(f => {
      const fieldLower = f.fieldname.toLowerCase();
      const tcodeTarget = f.drilldown_tcode?.toUpperCase();
      return `      WHEN '${f.fieldname.toUpperCase()}'.
        " ${f.coltext} 클릭 시 드릴다운 처리 (${tcodeTarget})
        READ TABLE gt_alv INTO gs_alv INDEX e_row_id-index.
        IF sy-subrc = 0.
          SET PARAMETER ID '${f.fieldname === 'VBELN' ? 'AUN' : f.fieldname === 'EBELN' ? 'BES' : f.fieldname === 'BELNR' ? 'BLN' : 'MAT'}' FIELD gs_alv-${fieldLower}.
          CALL TRANSACTION '${tcodeTarget}' AND SKIP FIRST SCREEN.
        ENDIF.`;
    }).join('\n');

  // Build Custom Toolbar additions from ToolbarEditor (spec.toolbar_buttons) and spec.custom_toolbar
  const customBtns = [
    ...(spec.toolbar_buttons?.filter(b => !b.is_standard && b.visible !== false) || []),
    ...(spec.custom_toolbar || []).filter(cb => !spec.toolbar_buttons?.some(tb => tb.function === cb.function)),
  ];

  const customToolbarCode = customBtns.map(tb => {
    return `    CLEAR ls_toolbar.
    ls_toolbar-function  = '${tb.function}'.
    ls_toolbar-icon      = icon_execute_object.
    ls_toolbar-quickinfo = '${tb.quickinfo}'.
    ls_toolbar-text      = '${tb.text}'.
    ls_toolbar-disabled  = '${tb.disabled ? 'X' : ' '}'.
    APPEND ls_toolbar TO e_object->mt_toolbar.`;
  }).join('\n');

  // Build Custom User Commands
  const userCommandBranches = customBtns.map(tb => {
    return `      WHEN '${tb.function}'.
        " ${tb.text} 버튼 수행 로직
        PERFORM do_${tb.function.toLowerCase()}.`;
  }).join('\n');

  return `*&---------------------------------------------------------------------*
*& Program Name   : ${progId}
*& Transaction    : ${tcode}
*& Title          : ${title}
*& Module         : ${spec.module}
*& Program Type   : Report Program with OOP ALV Grid (CL_GUI_ALV_GRID)
*& Author         : ${spec.author}
*& Creation Date  : ${dateStr}
*& Target Release : ${spec.target_sap_release}
*& Description    : 
*& ${spec.business_purpose.split('\n').map(l => '*& ' + l).join('\n')}
*&---------------------------------------------------------------------*
REPORT ${progId}
       MESSAGE-ID z01
       NO STANDARD PAGE HEADING
       LINE-SIZE 255.

*----------------------------------------------------------------------*
* TABLES DEFINITION
*----------------------------------------------------------------------*
${tablesDecl ? `TABLES: ${tablesDecl}.` : '* No DB tables required directly in selection screen'}

*----------------------------------------------------------------------*
* TYPE DECLARATION (ALV Output Structure)
*----------------------------------------------------------------------*
TYPES: BEGIN OF ty_alv,
${fieldDefs}
    cellstyle     TYPE lvc_t_styl,         " 셀 단위 편집/잠금 제어
    rowcolor      TYPE c LENGTH 4,         " 행 단위 하이라이트 색상 (C100~C710)
END OF ty_alv.

*----------------------------------------------------------------------*
* GLOBAL VARIABLES & DATA DECLARATION
*----------------------------------------------------------------------*
DATA: gt_alv TYPE TABLE OF ty_alv,
      gs_alv TYPE ty_alv.

" ALV Grid and Container Objects
DATA: go_container TYPE REF TO cl_gui_custom_container,
      go_grid      TYPE REF TO cl_gui_alv_grid.

" ALV Data Structures
DATA: gt_fcat    TYPE lvc_t_fcat,
      gs_fcat    TYPE lvc_s_fcat,
      gs_layo    TYPE lvc_s_layo,
      gs_variant TYPE disvariant.

" Screen Status Code
DATA: ok_code TYPE sy-ucomm,
      save_ok TYPE sy-ucomm.

*----------------------------------------------------------------------*
* MACRO FOR FIELD CATALOG
*----------------------------------------------------------------------*
DEFINE _set_fcat.
  CLEAR gs_fcat.
  gs_fcat-fieldname = &1.
  gs_fcat-coltext   = &2.
  gs_fcat-scrtext_s = &2.
  gs_fcat-scrtext_m = &2.
  gs_fcat-scrtext_l = &2.
  gs_fcat-key       = &3.
  gs_fcat-hotspot   = &4.
  gs_fcat-checkbox  = &5.
  gs_fcat-edit      = &6.
  gs_fcat-do_sum    = &7.
  gs_fcat-just      = &8.
  gs_fcat-outputlen = &9.
  IF &10 NE ' '.
    gs_fcat-emphasize = &10.
  ENDIF.
  APPEND gs_fcat TO gt_fcat.
END-OF-DEFINITION.

*----------------------------------------------------------------------*
* CLASS lcl_event_receiver DEFINITION
*----------------------------------------------------------------------*
CLASS lcl_event_receiver DEFINITION FINAL.
  PUBLIC SECTION.
    METHODS:
      handle_hotspot_click FOR EVENT hotspot_click OF cl_gui_alv_grid
        IMPORTING e_row_id e_column_id,

      handle_double_click FOR EVENT double_click OF cl_gui_alv_grid
        IMPORTING e_row e_column,

      handle_toolbar FOR EVENT toolbar OF cl_gui_alv_grid
        IMPORTING e_object e_interactive,

      handle_user_command FOR EVENT user_command OF cl_gui_alv_grid
        IMPORTING e_ucomm,

      handle_data_changed FOR EVENT data_changed OF cl_gui_alv_grid
        IMPORTING er_data_changed.
ENDCLASS.

*----------------------------------------------------------------------*
* CLASS lcl_event_receiver IMPLEMENTATION
*----------------------------------------------------------------------*
CLASS lcl_event_receiver IMPLEMENTATION.
  METHOD handle_hotspot_click.
    CASE e_column_id-fieldname.
${hotspotBranches || `      WHEN OTHERS.\n        " 기타 핫스팟 클릭 이벤트`}
    ENDCASE.
  ENDMETHOD.

  METHOD handle_double_click.
    " 더블 클릭 시 상세 행 정보 조회 또는 서브 팝업 호출
    READ TABLE gt_alv INTO gs_alv INDEX e_row-index.
    IF sy-subrc = 0.
      MESSAGE s000(z01) WITH '더블클릭 행 번호:' e_row-index.
    ENDIF.
  ENDMETHOD.

  METHOD handle_toolbar.
    DATA: ls_toolbar TYPE stb_button.

${customToolbarCode || '    " 표준 ALV 툴바 사용'}
  ENDMETHOD.

  METHOD handle_user_command.
    CASE e_ucomm.
${userCommandBranches || `      WHEN OTHERS.\n        " 사용자 지정 커맨드 처리`}
    ENDCASE.
  ENDMETHOD.

  METHOD handle_data_changed.
    " 그리드 셀 편집 완료 시 검증 및 데이터 반영
    MESSAGE s000(z01) WITH '그리드 데이터 변경 완료'.
  ENDMETHOD.
ENDCLASS.

DATA: go_event_receiver TYPE REF TO lcl_event_receiver.

*----------------------------------------------------------------------*
* SELECTION SCREEN
*----------------------------------------------------------------------*
SELECTION-SCREEN BEGIN OF BLOCK b1 WITH FRAME TITLE TEXT-001.
${selScreenCode}
SELECTION-SCREEN END OF BLOCK b1.

*----------------------------------------------------------------------*
* INITIALIZATION
*----------------------------------------------------------------------*
INITIALIZATION.
  TEXT-001 = '기본 조회 조건 (Selection Criteria)'.
  gs_variant-report = sy-repid.

*----------------------------------------------------------------------*
* AT SELECTION-SCREEN
*----------------------------------------------------------------------*
AT SELECTION-SCREEN.
  " 파라미터 유효성 검증

*----------------------------------------------------------------------*
* START-OF-SELECTION
*----------------------------------------------------------------------*
START-OF-SELECTION.
  PERFORM get_data.

*----------------------------------------------------------------------*
* END-OF-SELECTION
*----------------------------------------------------------------------*
END-OF-SELECTION.
  IF gt_alv IS INITIAL.
    MESSAGE s004(z01) WITH '조회된 데이터가 없습니다.' DISPLAY LIKE 'W'.
    EXIT.
  ENDIF.

  CALL SCREEN 0100.

*----------------------------------------------------------------------*
* MODULE STATUS_0100 OUTPUT (PBO)
*----------------------------------------------------------------------*
MODULE status_0100 OUTPUT.
  SET PF-STATUS 'STATUS_0100'.
  SET TITLEBAR 'TITLE_0100' WITH '${spec.title}'.

  IF go_container IS INITIAL.
    PERFORM create_alv_instance.
    PERFORM set_fcat.
    PERFORM set_layout.
    PERFORM set_events.
    PERFORM display_alv.
  ELSE.
    PERFORM refresh_alv.
  ENDIF.
ENDMODULE.

*----------------------------------------------------------------------*
* MODULE USER_COMMAND_0100 INPUT (PAI)
*----------------------------------------------------------------------*
MODULE user_command_0100 INPUT.
  save_ok = ok_code.
  CLEAR ok_code.

  CASE save_ok.
    WHEN 'BACK' OR 'CANC'.
      LEAVE TO SCREEN 0.
    WHEN 'EXIT'.
      LEAVE PROGRAM.
    WHEN 'REFRESH'.
      PERFORM get_data.
      PERFORM refresh_alv.
  ENDCASE.
ENDMODULE.

*----------------------------------------------------------------------*
* FORM CREATE_ALV_INSTANCE
*----------------------------------------------------------------------*
FORM create_alv_instance.
  CREATE OBJECT go_container
    EXPORTING
      container_name = 'CC_ALV'
    EXCEPTIONS
      others         = 1.

  IF sy-subrc <> 0.
    MESSAGE e001(z01) WITH 'Custom Container 생성 실패'.
  ENDIF.

  CREATE OBJECT go_grid
    EXPORTING
      i_parent = go_container
    EXCEPTIONS
      others   = 1.

  IF sy-subrc <> 0.
    MESSAGE e001(z01) WITH 'ALV Grid 객체 생성 실패'.
  ENDIF.
ENDFORM.

*----------------------------------------------------------------------*
* FORM SET_FCAT (Field Catalog Configuration)
*----------------------------------------------------------------------*
FORM set_fcat.
  CLEAR gt_fcat.

${fcatLines}
ENDFORM.

*----------------------------------------------------------------------*
* FORM SET_LAYOUT
*----------------------------------------------------------------------*
FORM set_layout.
${layoutStatements}
ENDFORM.

*----------------------------------------------------------------------*
* FORM SET_EVENTS
*----------------------------------------------------------------------*
FORM set_events.
  CREATE OBJECT go_event_receiver.

  SET HANDLER:
    go_event_receiver->handle_hotspot_click FOR go_grid,
    go_event_receiver->handle_double_click  FOR go_grid,
    go_event_receiver->handle_toolbar       FOR go_grid,
    go_event_receiver->handle_user_command  FOR go_grid,
    go_event_receiver->handle_data_changed  FOR go_grid.

  " 셀 변경 시 즉시 반영 모드 등록
  CALL METHOD go_grid->register_edit_event
    EXPORTING
      i_event_id = cl_gui_alv_grid=>mc_evt_modified.
ENDFORM.

*----------------------------------------------------------------------*
* FORM DISPLAY_ALV
*----------------------------------------------------------------------*
FORM display_alv.
  CALL METHOD go_grid->set_table_for_first_display
    EXPORTING
      is_layout       = gs_layo
      is_variant      = gs_variant
      i_save          = 'A'
      i_default       = 'X'
    CHANGING
      it_outtab       = gt_alv
      it_fieldcatalog = gt_fcat
    EXCEPTIONS
      others          = 1.

  IF sy-subrc <> 0.
    MESSAGE e002(z01) WITH 'ALV 출력 실패'.
  ENDIF.
ENDFORM.

*----------------------------------------------------------------------*
* FORM REFRESH_ALV
*----------------------------------------------------------------------*
FORM refresh_alv.
  DATA: ls_stable TYPE lvc_s_stbl.
  ls_stable-row = 'X'.
  ls_stable-col = 'X'.

  CALL METHOD go_grid->refresh_table_display
    EXPORTING
      is_stable = ls_stable
    EXCEPTIONS
      others    = 1.
ENDFORM.

*----------------------------------------------------------------------*
* FORM GET_DATA (Business Extraction Logic)
*----------------------------------------------------------------------*
FORM get_data.
  CLEAR: gt_alv, gs_alv.

  " [업무 추출 로직 설명]
  " ${spec.data_extraction_logic.replace(/\n/g, '\n  " ')}

  " 개발 서버 DB 실데이터 추출 SQL 구문 작성 위치
  " SELECT ... INTO CORRESPONDING FIELDS OF TABLE gt_alv FROM ...
ENDFORM.

${spec.custom_toolbar.map(tb => `
*----------------------------------------------------------------------*
* FORM DO_${tb.function.toUpperCase()}
*----------------------------------------------------------------------*
FORM do_${tb.function.toLowerCase()}.
  " ${tb.text} 로직 구현
  MESSAGE s000(z01) WITH '${tb.text} 처리가 정상적으로 완료되었습니다.'.
ENDFORM.`).join('\n')}
`;
}
