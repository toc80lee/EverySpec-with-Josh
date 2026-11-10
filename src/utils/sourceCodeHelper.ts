import { ProgramSpec, AlvField } from '../types/sap';

/**
 * Returns today's date formatted as YYYY.MM.DD
 */
export function getTodayFormatted(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

/**
 * Generates the default ABAP template for the 'Program' main report tab per RFQ v.1.19
 *
 * Rules:
 * - Module(Sub) : Module of the spec (e.g. CO, SD, MM, etc.)
 * - Program ID : spec.program_id (e.g. ZCOAR0060)
 * - Program name: spec.title
 * - Type : Report
 * - T_CODE : spec.tcode
 * - Creator : spec.author
 * - Create Date : Today's date (YYYY.MM.DD)
 * - Description : Same as Program name (spec.title)
 * - REPORT <program_id_lowercase>.
 * - include zcozicommtop.
 * - include zcozicommf01.
 * - "
 * - include <program_id_lowercase>top.
 * - include <program_id_lowercase>s01.
 * - include <program_id_lowercase>c01.
 * - include <program_id_lowercase>mod.
 * - include <program_id_lowercase>f01.
 * - Event blocks: INITIALIZATION, AT SELECTION-SCREEN, AT SELECTION-SCREEN OUTPUT, START-OF-SELECTION, END-OF-SELECTION
 */
export function generateDefaultProgramSource(spec: Partial<ProgramSpec>): string {
  const moduleStr = spec.module || 'CO';
  const progId = (spec.program_id || 'ZRALV0010').trim();
  const progIdLower = progId.toLowerCase();
  const progName = spec.title || 'Single ALV Grid';
  const tcode = spec.tcode || progId;
  const creator = spec.author || 'Josh Lee';
  const today = getTodayFormatted();
  const description = progName;

  return `************************************************************************
* Module(Sub)  : ${moduleStr}
* Program ID   : ${progId}
* Program name : ${progName}
* Type         : Report
* T_CODE       : ${tcode}
* Creator      : ${creator}
* Create Date  : ${today}
* Description  : ${description}
************************************************************************
*                          MODIFICATION LOG                            *
*----------------------------------------------------------------------*
* Chg No    DATE        AUTHORS      DESCRIPTION                       *
*----------------------------------------------------------------------*
* Initial   ${today}  SAP ID       Initial Release                   *
*    U1     9999/12/31  SAP ID       N/A                               *
************************************************************************
* Comment :
************************************************************************
REPORT ${progIdLower}.

*----------------------------------------------------------------------*
* INCLUDE                                                              *
*----------------------------------------------------------------------*
INCLUDE zcozicommtop.
INCLUDE zcozicommf01.
INCLUDE ${progIdLower}top.
INCLUDE ${progIdLower}s01.
INCLUDE ${progIdLower}c01.
INCLUDE ${progIdLower}mod.
INCLUDE ${progIdLower}f01.

*----------------------------------------------------------------------*
* INITIALIZATION                                                       *
*----------------------------------------------------------------------*
INITIALIZATION.
  PERFORM set_init.

*----------------------------------------------------------------------*
* AT SELECTION-SCREEN OUTPUT                                           *
*----------------------------------------------------------------------*
AT SELECTION-SCREEN.
  PERFORM set_screen.

*----------------------------------------------------------------------*
* AT SELECTION-SCREEN OUTPUT                                           *
*----------------------------------------------------------------------*
AT SELECTION-SCREEN OUTPUT.
  PERFORM set_output.

*----------------------------------------------------------------------*
* START-OF-SELECTION                                                   *
*----------------------------------------------------------------------*
START-OF-SELECTION.
  PERFORM set_para.
  PERFORM get_data.
  PERFORM set_data.

*----------------------------------------------------------------------*
* END-OF-SELECTION                                                     *
*----------------------------------------------------------------------*
END-OF-SELECTION.
  PERFORM end_sele.
`;
}

/**
 * Generates the default ABAP template for the 'TOP' tab for Sample Type 01,
/**
 * Helper to build field declaration lines from an AlvField array
 */
function buildStructFieldLines(fields: AlvField[]): string {
  if (!fields || fields.length === 0) return '';
  const lines: string[] = [];

  fields.forEach((f) => {
    const fname = f.fieldname.toLowerCase();
    // Skip zicon since it's declared as zicon TYPE icon-id above
    if (fname === 'zicon') return;

    let typeStr = '';
    if (f.ref_table && f.ref_field) {
      typeStr = `${f.ref_table.toLowerCase()}-${f.ref_field.toLowerCase()}`;
    } else if (f.datatype === 'CHAR') {
      typeStr = `c LENGTH ${f.outputlen || 10}`;
    } else if (f.datatype === 'NUMC') {
      typeStr = `numc${f.outputlen || 4}`;
    } else if (f.datatype === 'DATS') {
      typeStr = 'dats';
    } else if (f.datatype === 'TIMS') {
      typeStr = 'tims';
    } else if (f.datatype === 'CURR') {
      typeStr = 'curr15_2';
    } else if (f.datatype === 'DEC') {
      typeStr = `p LENGTH ${Math.ceil((f.outputlen || 8) / 2)} DECIMALS ${f.decimals || 2}`;
    } else if (f.datatype === 'INT4') {
      typeStr = 'i';
    } else if (f.datatype === 'STRING') {
      typeStr = 'string';
    } else {
      typeStr = f.datatype ? f.datatype.toLowerCase() : 'c LENGTH 10';
    }

    const paddedName = fname.padEnd(12);
    lines.push(`        ${paddedName} TYPE ${typeStr},`);
  });

  return lines.join('\n');
}

/**
 * Generates the default ABAP template for the 'TOP' tab
 * - Sample Type 01: Screen 0100 (Single Grid) linked with field_catalog
 * - Sample Type 02: Screen 0100 (Header Grid) & Screen 0110 (Item Grid) linked with field_catalog & item_grid.field_catalog
 */
export function generateDefaultTopSource(spec: Partial<ProgramSpec>): string {
  const isSample02 = spec.sample_type === '02';

  // 1. Build Header 0100 field lines
  const headerFields = spec.field_catalog || [];
  let headerFieldLines = buildStructFieldLines(headerFields);

  if (!headerFieldLines) {
    if (isSample02) {
      headerFieldLines = `        doc_no       TYPE vbak-vbeln,
        doc_date     TYPE vbak-erdat,
        partner_name TYPE kna1-name1,
        amount       TYPE vbap-netwr,
        currency     TYPE vbak-waerk,`;
    } else {
      headerFieldLines = `        tabix    TYPE numc3,
        bukrs    TYPE zcozs0001-bukrs,
        ksgru    TYPE zcozs0001-ksgru,
        ksgru_nm TYPE txt40,
        kostl    TYPE zcozs0001-kostl,
        ltext    TYPE cskt-ltext,
        datab    TYPE csks-datab,
        datbi    TYPE csks-datbi,
        ktext    TYPE cskt-ktext,
        verak    TYPE csks-verak,
        abtei    TYPE csks-abtei,  
        kosar    TYPE csks-kosar,
        khinr    TYPE csks-khinr,
        gsber    TYPE csks-gsber,
        prctr    TYPE csks-prctr,
        bkzkp    TYPE csks-bkzkp,
        pkzkp    TYPE csks-pkzkp,
        bkzks    TYPE csks-bkzks,
        bkzer    TYPE csks-bkzer,
        bkzob    TYPE csks-bkzob,
        pkzks    TYPE csks-pkzks,
        pkzer    TYPE csks-pkzer,
        mgefl    TYPE csks-mgefl,
        land1    TYPE t001-land1,  
        txjcd    TYPE t001w-txjcd,  
        vkgrp    TYPE csks-vkgrp.`;
    }
  }

  // 2. If Sample Type 02, build Item 0110 section
  let item0110Section = '';
  if (isSample02) {
    const itemFields = spec.item_grid?.field_catalog || [];
    let itemFieldLines = buildStructFieldLines(itemFields);
    if (!itemFieldLines) {
      itemFieldLines = `        doc_no       TYPE vbak-vbeln,
        doc_date     TYPE vbak-erdat,
        partner_name TYPE kna1-name1,
        amount       TYPE vbap-netwr,
        currency     TYPE vbak-waerk,`;
    }

    item0110Section = `
*--------------------------------------------------------------------*
* Screen 0110
*--------------------------------------------------------------------*
DATA: gv_title_0110 TYPE sy-title,
      go_dock_0110  TYPE REF TO cl_gui_docking_container.
" - Grid
CONSTANTS:
  gc_grid_0110 TYPE c LENGTH 30 VALUE 'GRID_0110',
  gc_cont_0110 TYPE c LENGTH 30 VALUE 'CONT_0110'.
DATA: gs_grid_0110 TYPE zgco2_s_grid,
      go_even_0110 TYPE REF TO lcl_event_receiver,
      BEGIN OF gs_0110,
        zicon    TYPE icon-id.

${itemFieldLines}

        INCLUDE STRUCTURE zgco2_s_itab. 
DATA: END OF gs_0110.
DATA: gt_0110 LIKE TABLE OF gs_0110.
`;
  }

  return `************************************************************************
* TOP                                                                  *
************************************************************************

*--------------------------------------------------------------------*
* Class
*--------------------------------------------------------------------*
CLASS lcl_event_receiver DEFINITION DEFERRED.
*--------------------------------------------------------------------*
* TABLES
*--------------------------------------------------------------------*
TABLES: sscrfields.
*--------------------------------------------------------------------*
* Global Data
*--------------------------------------------------------------------*
DATA: gv_ok_code TYPE sy-ucomm,
      gv_save_ok TYPE sy-ucomm,
      gs_prgi    TYPE zgco2_s_prgi,
      gt_ucom    TYPE zgco2_t_ucom.
*--------------------------------------------------------------------*
* Screen 0100
*--------------------------------------------------------------------*
${
  isSample02
    ? `DATA: gv_title_0100 TYPE sy-title,
      go_dock_0100  TYPE REF TO cl_gui_docking_container.`
    : `DATA: gv_title_0100 TYPE sy-title.`
}
" - Grid
CONSTANTS:
  gc_grid_0100 TYPE c LENGTH 30 VALUE 'GRID_0100',
  gc_cont_0100 TYPE c LENGTH 30 VALUE 'CONT_0100'.
DATA: gs_grid_0100 TYPE zgco2_s_grid,
      go_even_0100 TYPE REF TO lcl_event_receiver,
      BEGIN OF gs_0100,
        zicon    TYPE icon-id.

${headerFieldLines}

        INCLUDE STRUCTURE zgco2_s_itab. 
DATA: END OF gs_0100.
DATA: gt_0100 LIKE TABLE OF gs_0100.${item0110Section}
`;
}

/**
 * Generates the ABAP source code for the 'S01' tab (Selection Screen Include),
 * dynamically linking with the Selection Parameters defined in the specification.
 */
export function generateDefaultS01Source(spec: Partial<ProgramSpec>): string {
  const progIdLower = (spec.program_id || 'ZRALV0010').toLowerCase();
  const params = spec.selection_params || [];

  if (params.length === 0) {
    return `************************************************************************
* S01 : Selection Screen                                               *
************************************************************************
*----------------------------------------------------------------------*
* SELECTION-SCREEN                                                     *
*----------------------------------------------------------------------*
SELECTION-SCREEN BEGIN OF BLOCK b1 WITH FRAME TITLE TEXT-t01.
* (Selection Screen에 등록된 파라미터가 없습니다)
SELECTION-SCREEN END OF BLOCK b1.
`;
  }

  // Group parameters by block_id / block_title if available, or default b1
  const blockMap = new Map<string, { title: string; items: typeof params }>();

  params.forEach((p, idx) => {
    const blockKey = p.block_id || 'b1';
    const blockTitle = p.block_title || '기본 조회 조건 (Selection Criteria)';
    if (!blockMap.has(blockKey)) {
      blockMap.set(blockKey, { title: blockTitle, items: [] });
    }
    blockMap.get(blockKey)!.items.push(p);
  });

  const blockCodeSections: string[] = [];
  let blockIdx = 1;

  blockMap.forEach((block, key) => {
    const bId = key || `b${blockIdx}`;
    const lines: string[] = [];
    lines.push(`SELECTION-SCREEN BEGIN OF BLOCK ${bId} WITH FRAME TITLE TEXT-${String(blockIdx).padStart(3, '0')}. " ${block.title}`);

    // Track TABLES for select-options
    const neededTables = new Set<string>();

    block.items.forEach((p) => {
      const pName = p.name.toLowerCase();
      const obligStr = p.obligatory ? ' OBLIGATORY' : '';
      const defVal = p.default_val ? ` DEFAULT '${p.default_val}'` : '';
      const memIdStr = p.memory_id ? ` MEMORY ID ${p.memory_id.toUpperCase()}` : '';

      if (p.kind === 'PARAMETER') {
        let typeStr = '';
        if (p.ref_table && p.ref_field) {
          typeStr = `TYPE ${p.ref_table.toLowerCase()}-${p.ref_field.toLowerCase()}`;
        } else if (p.datatype === 'CHAR') {
          typeStr = `TYPE c LENGTH ${p.length || 10}`;
        } else if (p.datatype === 'NUMC') {
          typeStr = `TYPE numc${p.length || 4}`;
        } else if (p.datatype === 'DATS') {
          typeStr = 'TYPE dats';
        } else if (p.datatype === 'TIMS') {
          typeStr = 'TYPE tims';
        } else if (p.datatype === 'INT4') {
          typeStr = 'TYPE i';
        } else {
          typeStr = `TYPE c LENGTH ${p.length || 10}`;
        }
        lines.push(`  PARAMETERS: ${pName} ${typeStr}${obligStr}${defVal}${memIdStr}. " ${p.text}`);
      } else if (p.kind === 'RADIOBUTTON') {
        const rGrp = p.radio_group ? ` USER-COMMAND uc_${p.radio_group.toLowerCase()}` : '';
        const grp = p.radio_group ? ` RADIOBUTTON GROUP ${p.radio_group.toLowerCase()}` : '';
        lines.push(`  PARAMETERS: ${pName}${grp}${defVal}. " ${p.text}`);
      } else if (p.kind === 'CHECKBOX') {
        lines.push(`  PARAMETERS: ${pName} AS CHECKBOX${defVal}. " ${p.text}`);
      } else {
        // SELECT_OPTION
        let forTarget = '';
        if (p.ref_table && p.ref_field) {
          forTarget = `${p.ref_table.toLowerCase()}-${p.ref_field.toLowerCase()}`;
          neededTables.add(p.ref_table.toLowerCase());
        } else if (p.datatype === 'DATS') {
          forTarget = 'sy-datum';
        } else {
          forTarget = `${pName}_val`;
        }
        lines.push(`  SELECT-OPTIONS: ${pName} FOR ${forTarget}${obligStr}${defVal}${memIdStr}. " ${p.text}`);
      }
    });

    lines.push(`SELECTION-SCREEN END OF BLOCK ${bId}.`);
    blockCodeSections.push(lines.join('\n'));
    blockIdx++;
  });

  return `************************************************************************
* S01 : Selection Screen                                               *
************************************************************************

*----------------------------------------------------------------------*
* SELECTION-SCREEN DEFINITION                                          *
*----------------------------------------------------------------------*
${blockCodeSections.join('\n\n')}
`;
}

/**
 * Generates the default ABAP template for the 'C01' tab (Local Event Receiver Class)
 * for Sample Type 01 and Sample Type 02.
 */
export function generateDefaultC01Source(): string {
  return `************************************************************************
* CLS                                                                  *
************************************************************************

************************************************************************
* LOCAL CLASS: LCL_EVENT_RECEIVER                                      *
************************************************************************
CLASS lcl_event_receiver DEFINITION.
  PUBLIC SECTION.
    DATA: lv_grid TYPE c LENGTH 30.
    METHODS:
      constructor
        IMPORTING iv_grid_text TYPE char30,
      handle_double_click
        FOR EVENT double_click OF z_cozcl_grid
        IMPORTING e_row e_column es_row_no,
      handle_hotspot_click
        FOR EVENT hotspot_click OF z_cozcl_grid
        IMPORTING e_row_id e_column_id es_row_no,
      handle_toolbar
        FOR EVENT toolbar OF z_cozcl_grid
        IMPORTING e_object e_interactive,
      handle_menu_button
        FOR EVENT menu_button OF z_cozcl_grid
        IMPORTING e_object e_ucomm,
      handle_user_command
        FOR EVENT user_command OF z_cozcl_grid
        IMPORTING e_ucomm. 
  PRIVATE SECTION.
ENDCLASS. "lcl_event_receiver DEFINITION
************************************************************************
* METHOD                                                               *
************************************************************************
CLASS lcl_event_receiver IMPLEMENTATION.
*===============================================================
  METHOD constructor.
    CALL METHOD super->constructor.
    lv_grid = iv_grid_text.
  ENDMETHOD.                    "constructor
*===============================================================
  METHOD handle_double_click.
    PERFORM uc_click USING lv_grid e_row e_column.
  ENDMETHOD.                    "handle_double_click
*===============================================================
  METHOD handle_hotspot_click.
    PERFORM uc_click USING lv_grid e_row_id e_column_id.
  ENDMETHOD.                    "handle_hotspot_click
*===============================================================
  METHOD handle_toolbar.
    PERFORM uc_toolbar USING lv_grid CHANGING e_object->mt_toolbar.
  ENDMETHOD.                    "handle_toolbar
*===============================================================
  METHOD handle_menu_button.
    PERFORM zm_menu_button USING lv_grid e_ucomm
                        CHANGING e_object.
  ENDMETHOD.                    "handle_menu_button
*===============================================================
  METHOD handle_user_command.
    PERFORM uc_user_command USING lv_grid e_ucomm.
  ENDMETHOD.                    "handle_user_command
ENDCLASS. "lcl_event_receiver IMPLEMENTATION
`;
}

/**
 * Generates the default ABAP template for the 'MOD' tab (PBO/PAI Screen Modules)
 * for Sample Type 01 (Single ALV Grid) and Sample Type 02 (Header-Item ALV Grid).
 */
export function generateDefaultModSource(sampleType: string = '01'): string {
  if (sampleType === '02') {
    return `************************************************************************
* MOD                                                                  *
************************************************************************

*&---------------------------------------------------------------------*
*&      Module  STATUS_0100  OUTPUT
*&---------------------------------------------------------------------*
*       text
*----------------------------------------------------------------------*
MODULE status_0100 OUTPUT.
  CLEAR gt_ucom.
  SET PF-STATUS '0100' EXCLUDING gt_ucom.
  SET TITLEBAR  '0100' WITH gs_prgi-title gv_title_0100.
ENDMODULE.
*&---------------------------------------------------------------------*
*&      Module  INIT_0100  OUTPUT
*&---------------------------------------------------------------------*
*       text
*----------------------------------------------------------------------*
MODULE init_0100 OUTPUT.
  " - Info
  PERFORM set_info_0100 USING pc_info CHANGING go_dock_0100.
  " – Grid: Header
  PERFORM set_grid_0100 USING gc_cont_0100 gc_grid_0100 pa_vari pc_icnt
                              gt_0100
                     CHANGING gs_grid_0100 go_even_0100.
  " – Grid: Item
  PERFORM set_grid_0110 USING gc_cont_0110 gc_grid_0110 pa_vari pc_icnt
                              gt_0110
                     CHANGING gs_grid_0110 go_even_0110.
ENDMODULE.
*&---------------------------------------------------------------------*
*&      Module  EXIT_0100  INPUT
*&---------------------------------------------------------------------*
MODULE exit_0100 INPUT.
  LEAVE TO SCREEN 0.
ENDMODULE.
*&---------------------------------------------------------------------*
*&      Module  user_command_0100  INPUT
*&---------------------------------------------------------------------*
MODULE user_command_0100 INPUT.
  PERFORM ucer_command_0100 USING gv_ok_code.
ENDMODULE.
`;
  }

  return `************************************************************************
* MOD                                                                  *
************************************************************************

*&---------------------------------------------------------------------*
*&      Module  STATUS_0100  OUTPUT
*&---------------------------------------------------------------------*
*       text
*----------------------------------------------------------------------*
MODULE status_0100 OUTPUT.
  CLEAR gt_ucom.
  SET PF-STATUS '0100' EXCLUDING gt_ucom.
  SET TITLEBAR  '0100' WITH gs_prgi-title gv_title_0100.
ENDMODULE.
*&---------------------------------------------------------------------*
*&      Module  INIT_0100  OUTPUT
*&---------------------------------------------------------------------*
*       text
*----------------------------------------------------------------------*
MODULE init_0100 OUTPUT.
  " - Info
  PERFORM set_info_0100 USING pc_info CHANGING go_dock_0100.
  " - Grid
  PERFORM set_grid_0100 USING gc_cont_0100 gc_grid_0100 pa_vari pc_icnt
                              gt_0100
                     CHANGING gs_grid_0100 go_even_0100.
ENDMODULE.
*&---------------------------------------------------------------------*
*&      Module  EXIT_0100  INPUT
*&---------------------------------------------------------------------*
MODULE exit_0100 INPUT.
  LEAVE TO SCREEN 0.
ENDMODULE.
*&---------------------------------------------------------------------*
*&      Module  user_command_0100  INPUT
*&---------------------------------------------------------------------*
MODULE user_command_0100 INPUT.
  PERFORM ucer_command_0100 USING gv_ok_code.
ENDMODULE.
`;
}

