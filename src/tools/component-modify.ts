import { getEdaApiRoot } from '../utils';

export interface ComponentModifyPayload {
	designator: string;
	newDesignator?: string;
	value?: string;
	footprint?: string;
	manufacturer?: string;
	supplier?: string;
	otherProperties?: Record<string, string | number | boolean>;
}

function normalizeComponent(component: unknown): Record<string, unknown> {
	if (!component || typeof component !== 'object') {
		return {};
	}
	return component as Record<string, unknown>;
}

export function createComponentModifyHandler(runtimeWindow: Window) {
	async function handleComponentModifyTask(payload?: unknown): Promise<unknown> {
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
				modify: (primitiveId: string | unknown, property: Record<string, unknown>) => Promise<unknown>;
			}
			| undefined;

		if (!schPrimitiveComponent || typeof schPrimitiveComponent.getAll !== 'function' || typeof schPrimitiveComponent.modify !== 'function') {
			return {
				ok: false,
				error: '未找到 eda.sch_PrimitiveComponent.getAll/modify API，请确认当前 EDA 版本支持器件修改。',
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
			.filter(component => String(component.designator ?? component.name ?? '').trim().toUpperCase() === targetDesignator.toUpperCase());

		if (matchedComponents.length === 0) {
			return {
				ok: false,
				error: `未找到位号为 "${targetDesignator}" 的器件，请确认位号是否正确。`,
			};
		}

		if (matchedComponents.length > 1) {
			return {
				ok: false,
				error: `找到多个位号为 "${targetDesignator}" 的器件（共 ${matchedComponents.length} 个），无法唯一确定修改目标。`,
			};
		}

		const targetComponent = matchedComponents[0];
		const primitiveId: string = String(targetComponent.primitiveId ?? targetComponent.uuid ?? targetComponent.id ?? '');
		if (!primitiveId) {
			return { ok: false, error: '目标器件缺少 primitiveId，无法执行修改。' };
		}

		const property: Record<string, unknown> = {};
		const otherProperty: Record<string, string | number | boolean> = {};

		if (typeof args.newDesignator === 'string' && args.newDesignator.trim()) {
			property.designator = args.newDesignator.trim();
		}
		if (typeof args.manufacturer === 'string' && args.manufacturer.trim()) {
			property.manufacturer = args.manufacturer.trim();
		}
		if (typeof args.supplier === 'string' && args.supplier.trim()) {
			property.supplier = args.supplier.trim();
		}
		if (typeof args.value === 'string' && args.value.trim()) {
			otherProperty.value = args.value.trim();
		}
		if (typeof args.footprint === 'string' && args.footprint.trim()) {
			otherProperty.footprint = args.footprint.trim();
		}
		if (isPlainObjectRecord(args.otherProperties)) {
			for (const [key, value] of Object.entries(args.otherProperties)) {
				if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
					otherProperty[key] = value;
				}
			}
		}

		if (Object.keys(otherProperty).length > 0) {
			property.otherProperty = otherProperty;
		}

		if (Object.keys(property).length === 0) {
			return { ok: false, error: '未提供任何需要修改的属性（支持 newDesignator/value/footprint/manufacturer/supplier/otherProperties）。' };
		}

		try {
			const result = await schPrimitiveComponent.modify(primitiveId, property);
			return {
				ok: true,
				message: `已成功修改器件 "${targetDesignator}" 的属性。`,
				modifiedProperties: property,
				result,
			};
		}
		catch (error: unknown) {
			const message: string = error instanceof Error ? error.message : String(error ?? '');
			return { ok: false, error: `修改器件失败：${message}` };
		}
	}

	return { handleComponentModifyTask };
}

function isPlainObjectRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
