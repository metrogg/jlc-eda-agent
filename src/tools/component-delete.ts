// ------------------------------------------------------------------------
// 名称：器件删除工具处理器
// 说明：根据目标位号查找当前页器件，返回删除确认协议，
//       由前端确认面板在用户确认后再调用 EDA API 执行删除。
// 作者：Lion
// 邮箱：chengbin@3578.cn
// 日期：2026-08-17
// 备注：删除确认面板渲染逻辑见 component-delete-ui.ts
// ------------------------------------------------------------------------
import { getEdaApiRoot } from '../utils';

/** 器件删除交互协议标识。 */
export const COMPONENT_DELETE_PROTOCOL: string = 'component-delete/v1';

/** 待删除器件信息。 */
export interface ComponentDeleteItem {
	primitiveId: string;
	designator: string;
	name: string;
	value: string;
	footprint: string;
}

/** 器件删除请求结构（嵌入工具返回值的 deletion 字段）。 */
export interface ComponentDeleteRequest {
	protocol: string;
	title: string;
	description: string;
	component: ComponentDeleteItem;
	reason?: string;
}

// 判断输入是否为普通对象。
function isPlainObjectRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// 调用对象上的无参状态读取方法，不存在时返回空字符串。
function callStateMethod(component: Record<string, unknown>, methodName: string): string {
	const method: unknown = (component as Record<string, unknown>)[methodName];
	if (typeof method === 'function') {
		try {
			const result: unknown = (method as () => unknown).call(component);
			if (typeof result === 'string') {
				return result;
			}
		}
		catch { }
	}
	return '';
}

// 安全读取对象上的字符串字段（优先状态方法，再回退到属性）。
function readStringField(component: Record<string, unknown>, key: string, methodName?: string): string {
	if (methodName) {
		const stateValue: string = callStateMethod(component, methodName);
		if (stateValue) {
			return stateValue;
		}
	}
	const value: unknown = component[key];
	if (typeof value === 'string') {
		return value;
	}
	if (value !== null && typeof value === 'object') {
		const recordValue = value as Record<string, unknown>;
		if (typeof recordValue.uuid === 'string') {
			return recordValue.uuid;
		}
	}
	return '';
}

// 从 otherProperty 或顶层字段读取 value/footprint。
function readPropertyField(component: Record<string, unknown>, key: string): string {
	const otherProperty: unknown = component.otherProperty;
	if (isPlainObjectRecord(otherProperty)) {
		const value: unknown = otherProperty[key];
		if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
			return String(value);
		}
	}
	const directValue: unknown = component[key];
	if (typeof directValue === 'string' || typeof directValue === 'number' || typeof directValue === 'boolean') {
		return String(directValue);
	}
	return '';
}

// 规范化组件对象。
function normalizeComponent(component: unknown): Record<string, unknown> {
	if (!component || typeof component !== 'object') {
		return {};
	}
	return component as Record<string, unknown>;
}

/**
 * 创建器件删除工具处理器。
 * @param runtimeWindow - 运行时窗口对象。
 * @returns 器件删除处理器。
 */
export function createComponentDeleteHandler(runtimeWindow: Window) {
	async function handleComponentDeleteTask(payload?: unknown): Promise<unknown> {
		const args = (payload !== null && typeof payload === 'object' && !Array.isArray(payload)
			? payload
			: {}) as Record<string, unknown>;

		const targetDesignator: string = String(args.designator ?? '').trim();
		if (!targetDesignator) {
			return { ok: false, error: '缺少目标位号，请提供 designator 参数（例如 "R1"）。' };
		}

		const root: unknown = getEdaApiRoot(runtimeWindow);
		if (root === null || typeof root !== 'object') {
			return { ok: false, error: '当前环境未检测到 EDA API 对象。' };
		}

		const schPrimitiveComponent = (root as Record<string, unknown>).sch_PrimitiveComponent as
			| {
				getAll: (componentType?: unknown, allSchematicPages?: unknown) => Promise<unknown[]>;
				delete: (primitiveIds: string | unknown | Array<string> | Array<unknown>) => Promise<boolean>;
			}
			| undefined;

		if (!schPrimitiveComponent || typeof schPrimitiveComponent.getAll !== 'function' || typeof schPrimitiveComponent.delete !== 'function') {
			return {
				ok: false,
				error: '未找到 eda.sch_PrimitiveComponent.getAll/delete API，请确认当前 EDA 版本支持器件删除。',
			};
		}

		let allComponents: unknown[];
		try {
			allComponents = await schPrimitiveComponent.getAll();
		}
		catch (error: unknown) {
			const message: string = error instanceof Error ? error.message : String(error ?? '');
			return { ok: false, error: `获取器件列表失败：${message}` };
		}

		if (!Array.isArray(allComponents)) {
			return { ok: false, error: 'EDA API 返回的器件列表格式异常。' };
		}

		const matchedComponents = allComponents
			.map(normalizeComponent)
			.filter((component) => {
				const designator: string = readStringField(component, 'designator', 'getState_Designator').trim();
				return designator.toUpperCase() === targetDesignator.toUpperCase();
			});

		if (matchedComponents.length === 0) {
			return {
				ok: false,
				error: `未找到位号为 "${targetDesignator}" 的器件，请确认位号是否正确。`,
			};
		}

		if (matchedComponents.length > 1) {
			return {
				ok: false,
				error: `找到多个位号为 "${targetDesignator}" 的器件（共 ${matchedComponents.length} 个），无法唯一确定删除目标。`,
			};
		}

		const targetComponent = matchedComponents[0];
		const primitiveId: string = readStringField(targetComponent, 'primitiveId', 'getState_PrimitiveId');
		if (!primitiveId) {
			return { ok: false, error: '目标器件缺少 primitiveId，无法执行删除。' };
		}

		// 某些位号可能代表电源/地符号（VCC/GND 等），禁止删除。
		const normalizedDesignator: string = targetDesignator.toUpperCase();
		const forbiddenTokens: string[] = ['VCC', 'VDD', 'VSS', 'GND', 'AGND', 'DGND', 'PGND', '+3.3V', '+5V', '3.3V', '5V'];
		if (forbiddenTokens.some(token => normalizedDesignator.includes(token))) {
			return {
				ok: false,
				error: `位号 "${targetDesignator}" 疑似电源/地符号，禁止通过 component_delete 删除。请在 EDA 中手动处理。`,
			};
		}

		const componentItem: ComponentDeleteItem = {
			primitiveId,
			designator: targetDesignator,
			name: readStringField(targetComponent, 'name', 'getState_Name'),
			value: readPropertyField(targetComponent, 'value'),
			footprint: readPropertyField(targetComponent, 'footprint'),
		};

		const deletion: ComponentDeleteRequest = {
			protocol: COMPONENT_DELETE_PROTOCOL,
			title: '确认删除器件',
			description: `请确认是否删除器件 ${targetDesignator}。该操作不可撤销，删除后器件及其连线关系将从当前原理图中移除。`,
			component: componentItem,
			reason: String(args.reason ?? '').trim(),
		};

		return {
			ok: true,
			deletion,
			message: `已定位器件 "${targetDesignator}"，等待用户确认删除。`,
		};
	}

	return { handleComponentDeleteTask };
}
