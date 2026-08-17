// ------------------------------------------------------------------------
// 名称：器件删除确认面板
// 说明：在聊天消息节点内渲染删除确认面板，等待用户确认后调用 EDA API 删除器件。
// 作者：Lion
// 邮箱：chengbin@3578.cn
// 日期：2026-08-17
// 备注：工具处理器逻辑见 component-delete.ts
// ------------------------------------------------------------------------
import type { ComponentDeleteItem, ComponentDeleteRequest } from './component-delete';
import { getEdaApiRoot } from '../utils';
import { COMPONENT_DELETE_PROTOCOL } from './component-delete';

interface RequestDeletePanelOptions {
	runtimeWindow?: Window;
	messageNode: HTMLElement;
	deleteRequest: ComponentDeleteRequest;
	abortSignal?: AbortSignal | null;
	onMounted?: () => void;
}

interface ApplyComponentDeleteOptions {
	runtimeWindow?: Window;
	toolResult: unknown;
	messageNode: HTMLElement;
	abortSignal?: AbortSignal | null;
	onBeforeShow?: () => void;
	onMounted?: () => void;
}

interface InteractiveDeletePanelResult {
	ok: boolean;
	confirmed?: boolean;
	deleted?: boolean;
	error?: string;
	errorCode?: string;
	message?: string;
	component?: ComponentDeleteItem;
}

interface DeleteComponentApi {
	context: unknown;
	method: (primitiveIds: string | Array<string>) => Promise<boolean>;
}

const COMPONENT_DELETE_STYLE_ID: string = 'jlceda-component-delete-style';

const COMPONENT_DELETE_STYLE_TEXT: string = [
	`.component-delete-overlay {`,
	`\tposition: fixed;`,
	`\tinset: 0;`,
	`\tz-index: 9000;`,
	`\tdisplay: flex;`,
	`\talign-items: center;`,
	`\tjustify-content: center;`,
	`\tpadding: 24px;`,
	`\tbox-sizing: border-box;`,
	`\toverflow: auto;`,
	`\tbackground: rgba(15, 23, 42, 0.22);`,
	`}`,
	`.component-delete-panel {`,
	`\tmargin: 0;`,
	`\twidth: min(480px, calc(100vw - 48px));`,
	`\tmax-width: 100%;`,
	`\tpadding: 16px;`,
	`\tborder: 1px solid var(--tool-border, #d2d2d2);`,
	`\tborder-radius: 8px;`,
	`\tbackground: var(--panel-bg, #ffffff);`,
	`\tbox-sizing: border-box;`,
	`\tbox-shadow: 0 24px 48px rgba(15, 23, 42, 0.18);`,
	`}`,
	`.component-delete-title {`,
	`\tfont-size: 14px;`,
	`\tfont-weight: 600;`,
	`\tcolor: var(--text-primary, #1a1a1a);`,
	`\tmargin-bottom: 6px;`,
	`}`,
	`.component-delete-desc {`,
	`\tfont-size: 12px;`,
	`\tline-height: 1.6;`,
	`\tcolor: var(--text-secondary, #3a3a3a);`,
	`\tmargin-bottom: 12px;`,
	`}`,
	`.component-delete-info {`,
	`\tdisplay: grid;`,
	`\tgrid-template-columns: auto 1fr;`,
	`\tgap: 6px 14px;`,
	`\tpadding: 10px 12px;`,
	`\tborder-radius: 6px;`,
	`\tbackground: var(--input-bg, #f0f0f0);`,
	`\tfont-size: 12px;`,
	`\tmargin-bottom: 14px;`,
	`}`,
	`.component-delete-info-label {`,
	`\tcolor: var(--text-secondary, #6b6560);`,
	`}`,
	`.component-delete-info-value {`,
	`\tcolor: var(--text-primary, #1a1a1a);`,
	`\tfont-weight: 500;`,
	`}`,
	`.component-delete-warning {`,
	`\tfont-size: 11px;`,
	`\tline-height: 1.5;`,
	`\tcolor: #ad4e1f;`,
	`\tmargin-bottom: 14px;`,
	`}`,
	`.component-delete-actions {`,
	`\tdisplay: flex;`,
	`\tjustify-content: flex-end;`,
	`\tgap: 8px;`,
	`}`,
	`.component-delete-button {`,
	`\theight: 28px;`,
	`\tpadding: 0 12px;`,
	`\tborder-radius: 5px;`,
	`\tborder: 1px solid #a0a0a0;`,
	`\tbackground: #e8e8e8;`,
	`\tcolor: #1a1a1a;`,
	`\tfont-size: 12px;`,
	`\tfont-weight: 600;`,
	`\tcursor: pointer;`,
	`\ttransition: background 0.15s ease, border-color 0.15s ease;`,
	`}`,
	`.component-delete-button:hover:not(:disabled) {`,
	`\tbackground: #dcdcdc;`,
	`\tborder-color: #888888;`,
	`}`,
	`.component-delete-button:active:not(:disabled) {`,
	`\tbackground: #cfcfcf;`,
	`\tborder-color: #787878;`,
	`}`,
	`.component-delete-button.danger {`,
	`\tbackground: #e57035;`,
	`\tcolor: #ffffff;`,
	`\tborder-color: #e57035;`,
	`}`,
	`.component-delete-button.danger:hover:not(:disabled) {`,
	`\tbackground: #c45f28;`,
	`\tborder-color: #c45f28;`,
	`}`,
	`.component-delete-button.danger:active:not(:disabled) {`,
	`\tbackground: #a64e20;`,
	`\tborder-color: #a64e20;`,
	`}`,
	`.component-delete-button:disabled {`,
	`\tborder-color: #c0c0c0;`,
	`\tbackground: #e0e0e0;`,
	`\tcolor: #909090;`,
	`\tcursor: default;`,
	`}`,
	`@media (prefers-color-scheme: dark) {`,
	`\t.component-delete-panel {`,
	`\t\tbackground: #1e1e1e;`,
	`\t\tborder-color: #3c3c3c;`,
	`\t}`,
	`\t.component-delete-title {`,
	`\t\tcolor: #e8e8e8;`,
	`\t}`,
	`\t.component-delete-desc {`,
	`\t\tcolor: #b0b0b0;`,
	`\t}`,
	`\t.component-delete-info {`,
	`\t\tbackground: #2a2a2a;`,
	`\t}`,
	`\t.component-delete-info-label {`,
	`\t\tcolor: #b0b0b0;`,
	`\t}`,
	`\t.component-delete-info-value {`,
	`\t\tcolor: #e8e8e8;`,
	`\t}`,
	`\t.component-delete-warning {`,
	`\t\tcolor: #f0a070;`,
	`\t}`,
	`\t.component-delete-button {`,
	`\t\tborder-color: #5a5a5a;`,
	`\t\tbackground: #3a3a3a;`,
	`\t\tcolor: #e8e8e8;`,
	`\t}`,
	`\t.component-delete-button:hover:not(:disabled) {`,
	`\t\tbackground: #484848;`,
	`\t\tborder-color: #727272;`,
	`\t}`,
	`\t.component-delete-button:active:not(:disabled) {`,
	`\t\tbackground: #2f2f2f;`,
	`\t\tborder-color: #5a5a5a;`,
	`\t}`,
	`\t.component-delete-button.danger {`,
	`\t\tbackground: #e57035;`,
	`\t\tcolor: #ffffff;`,
	`\t\tborder-color: #e57035;`,
	`\t}`,
	`\t.component-delete-button.danger:hover:not(:disabled) {`,
	`\t\tbackground: #c45f28;`,
	`\t\tborder-color: #c45f28;`,
	`\t}`,
	`\t.component-delete-button.danger:active:not(:disabled) {`,
	`\t\tbackground: #a64e20;`,
	`\t\tborder-color: #a64e20;`,
	`\t}`,
	`\t.component-delete-button:disabled {`,
	`\t\tborder-color: #444444;`,
	`\t\tbackground: #2a2a2a;`,
	`\t\tcolor: #666666;`,
	`\t}`,
	`}`,
].join('\n');

// 判断值是否为普通对象。
function isObjectRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// 确保样式节点只注入一次。
function ensureComponentDeleteStyleMounted(): void {
	if (document.getElementById(COMPONENT_DELETE_STYLE_ID)) {
		return;
	}
	const styleElement: HTMLStyleElement = document.createElement('style');
	styleElement.id = COMPONENT_DELETE_STYLE_ID;
	styleElement.textContent = COMPONENT_DELETE_STYLE_TEXT;
	document.head.appendChild(styleElement);
}

// 解析删除器件 API。
function resolveDeleteComponentApi(runtimeWindow: Window): DeleteComponentApi {
	const root: unknown = getEdaApiRoot(runtimeWindow);
	if (!isObjectRecord(root)) {
		throw new Error('当前环境未检测到 EDA API 对象。');
	}
	const componentModule: unknown = root.sch_PrimitiveComponent;
	if (!isObjectRecord(componentModule) || typeof componentModule.delete !== 'function') {
		throw new Error('未找到 eda.sch_PrimitiveComponent.delete API。');
	}
	return {
		context: componentModule,
		method: componentModule.delete as (primitiveIds: string | Array<string>) => Promise<boolean>,
	};
}

// 转换异常为文本。
function toSafeErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error ?? '');
}

/**
 * 从工具返回结果中解析器件删除协议请求。
 * @param toolResult - 工具执行返回值。
 * @returns 解析成功返回请求对象，否则返回 null。
 */
export function parseComponentDeleteRequest(toolResult?: unknown): ComponentDeleteRequest | null {
	if (!isObjectRecord(toolResult)) {
		return null;
	}
	const deletionObject: unknown = toolResult.deletion;
	if (!isObjectRecord(deletionObject)) {
		return null;
	}
	if (String(deletionObject.protocol ?? '').trim() !== COMPONENT_DELETE_PROTOCOL) {
		return null;
	}

	const rawComponent: unknown = deletionObject.component;
	if (!isObjectRecord(rawComponent)) {
		return null;
	}
	const primitiveId: string = String(rawComponent.primitiveId ?? '').trim();
	const designator: string = String(rawComponent.designator ?? '').trim();
	if (!primitiveId || !designator) {
		return null;
	}

	return {
		protocol: COMPONENT_DELETE_PROTOCOL,
		title: String(deletionObject.title ?? '').trim() || '确认删除器件',
		description: String(deletionObject.description ?? '').trim() || `请确认是否删除器件 ${designator}。`,
		component: {
			primitiveId,
			designator,
			name: String(rawComponent.name ?? '').trim(),
			value: String(rawComponent.value ?? '').trim(),
			footprint: String(rawComponent.footprint ?? '').trim(),
		},
		reason: String(deletionObject.reason ?? '').trim() || undefined,
	};
}

// 创建信息行。
function createInfoRow(label: string, value: string): [HTMLDivElement, HTMLDivElement] {
	const labelElement: HTMLDivElement = document.createElement('div');
	labelElement.className = 'component-delete-info-label';
	labelElement.textContent = label;
	const valueElement: HTMLDivElement = document.createElement('div');
	valueElement.className = 'component-delete-info-value';
	valueElement.textContent = value || '-';
	return [labelElement, valueElement];
}

/**
 * 在工具消息节点内渲染器件删除确认面板，并等待用户决策。
 * @param options - 面板选项。
 * @returns 最终工具结果对象。
 */
export async function requestComponentDeletePanel(options: RequestDeletePanelOptions): Promise<InteractiveDeletePanelResult> {
	ensureComponentDeleteStyleMounted();
	const runtimeWindow: Window = options.runtimeWindow || window;
	const deleteRequest: ComponentDeleteRequest = options.deleteRequest;

	return await new Promise<InteractiveDeletePanelResult>((resolve) => {
		let resolved: boolean = false;
		const overlayElement: HTMLDivElement = document.createElement('div');
		overlayElement.className = 'component-delete-overlay';

		const panelElement: HTMLDivElement = document.createElement('div');
		panelElement.className = 'component-delete-panel';
		overlayElement.appendChild(panelElement);

		const titleElement: HTMLDivElement = document.createElement('div');
		titleElement.className = 'component-delete-title';
		titleElement.textContent = deleteRequest.title;
		panelElement.appendChild(titleElement);

		const descElement: HTMLDivElement = document.createElement('div');
		descElement.className = 'component-delete-desc';
		descElement.textContent = deleteRequest.description;
		panelElement.appendChild(descElement);

		const infoElement: HTMLDivElement = document.createElement('div');
		infoElement.className = 'component-delete-info';
		const component = deleteRequest.component;
		const [designatorLabel, designatorValue] = createInfoRow('位号', component.designator);
		const [nameLabel, nameValue] = createInfoRow('符号/型号', component.name);
		const [valueLabel, valueValue] = createInfoRow('参数值', component.value);
		const [footprintLabel, footprintValue] = createInfoRow('封装', component.footprint);
		infoElement.appendChild(designatorLabel);
		infoElement.appendChild(designatorValue);
		infoElement.appendChild(nameLabel);
		infoElement.appendChild(nameValue);
		infoElement.appendChild(valueLabel);
		infoElement.appendChild(valueValue);
		infoElement.appendChild(footprintLabel);
		infoElement.appendChild(footprintValue);
		panelElement.appendChild(infoElement);

		if (deleteRequest.reason) {
			const reasonElement: HTMLDivElement = document.createElement('div');
			reasonElement.className = 'component-delete-warning';
			reasonElement.textContent = `删除原因：${deleteRequest.reason}`;
			panelElement.appendChild(reasonElement);
		}

		const warningElement: HTMLDivElement = document.createElement('div');
		warningElement.className = 'component-delete-warning';
		warningElement.textContent = '警告：删除后无法自动撤销，请确认该器件及其连接确实不再需要。';
		panelElement.appendChild(warningElement);

		const actionsElement: HTMLDivElement = document.createElement('div');
		actionsElement.className = 'component-delete-actions';
		const cancelButton: HTMLButtonElement = document.createElement('button');
		cancelButton.className = 'component-delete-button';
		cancelButton.type = 'button';
		cancelButton.textContent = '取消';
		const deleteButton: HTMLButtonElement = document.createElement('button');
		deleteButton.className = 'component-delete-button danger';
		deleteButton.type = 'button';
		deleteButton.textContent = '确认删除';
		actionsElement.appendChild(cancelButton);
		actionsElement.appendChild(deleteButton);
		panelElement.appendChild(actionsElement);
		document.body.appendChild(overlayElement);

		let onAbort: (() => void) | undefined;

		function finalize(result: InteractiveDeletePanelResult): void {
			if (resolved) {
				return;
			}
			resolved = true;
			if (options.abortSignal && onAbort) {
				options.abortSignal.removeEventListener('abort', onAbort);
			}
			overlayElement.remove();
			resolve(result);
		}

		async function handleDelete(): Promise<void> {
			deleteButton.disabled = true;
			cancelButton.disabled = true;
			try {
				const deleteApi: DeleteComponentApi = resolveDeleteComponentApi(runtimeWindow);
				const deleted: boolean = await Promise.resolve(deleteApi.method.call(deleteApi.context, component.primitiveId));
				if (deleted) {
					finalize({
						ok: true,
						confirmed: true,
						deleted: true,
						component,
						message: `已删除器件 "${component.designator}"。`,
					});
				}
				else {
					finalize({
						ok: false,
						confirmed: true,
						deleted: false,
						error: `删除器件 "${component.designator}" 时 EDA 返回 false，可能器件已被删除或不可删除。`,
						errorCode: 'COMPONENT_DELETE_API_FALSE',
						component,
					});
				}
			}
			catch (error: unknown) {
				finalize({
					ok: false,
					confirmed: true,
					deleted: false,
					error: `删除器件失败：${toSafeErrorMessage(error)}`,
					errorCode: 'COMPONENT_DELETE_API_ERROR',
					component,
				});
			}
		}

		onAbort = (): void => {
			finalize({
				ok: false,
				confirmed: false,
				deleted: false,
				error: '用户取消器件删除，工具执行已终止。',
				errorCode: 'COMPONENT_DELETE_ABORTED',
				component,
			});
		};

		cancelButton.addEventListener('click', () => {
			finalize({
				ok: false,
				confirmed: false,
				deleted: false,
				error: '用户取消删除，未执行任何操作。',
				errorCode: 'COMPONENT_DELETE_CANCELLED',
				component,
			});
		});

		deleteButton.addEventListener('click', () => {
			void handleDelete();
		});

		if (options.abortSignal) {
			if (options.abortSignal.aborted) {
				onAbort();
				return;
			}
			options.abortSignal.addEventListener('abort', onAbort, { once: true });
		}

		if (options.onMounted) {
			options.onMounted();
			window.setTimeout(() => {
				if (options.onMounted) {
					options.onMounted();
				}
			}, 50);
		}
	});
}

/**
 * 检测工具返回结果是否包含器件删除协议，若是则展示确认面板并返回最终结果。
 * @param options - 交互选项。
 * @returns 若不含删除协议返回 null；否则返回转换后的工具结果对象。
 */
export async function applyComponentDeleteInteraction(options: ApplyComponentDeleteOptions): Promise<unknown> {
	const deleteRequest: ComponentDeleteRequest | null = parseComponentDeleteRequest(options.toolResult);
	if (!deleteRequest) {
		return null;
	}
	if (options.onBeforeShow) {
		options.onBeforeShow();
	}
	const panelResult: InteractiveDeletePanelResult = await requestComponentDeletePanel({
		runtimeWindow: options.runtimeWindow || window,
		messageNode: options.messageNode,
		deleteRequest,
		abortSignal: options.abortSignal,
		onMounted: options.onMounted,
	});
	return panelResult;
}
