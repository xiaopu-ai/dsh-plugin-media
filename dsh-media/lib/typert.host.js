import { $ as ZodString, $n as uuid, $r as _property, $t as int, A as ZodJWT, An as preprocess, Ar as _coercedDate, At as boolean$1, B as ZodNull, Bn as stringbool, Br as _lte, Bt as discriminatedUnion, C as ZodExactOptional, Ci as config, Cn as nullish, Cr as iso_exports, Ct as _undefined, D as ZodIPv4, Dn as partialRecord, Dr as TimePrecision, Dt as base64, E as ZodGUID, En as optional, Er as toJSONSchema, Et as array, F as ZodMap, Fn as schemas_exports, Fr as _gte, Ft as cuid, G as ZodOptional, Gn as transform, Gr as _minSize, Gt as file, H as ZodNumber, Hn as superRefine, Hr as _maxSize, Ht as email, I as ZodNaN, In as set, Ir as _includes, It as cuid2, J as ZodPreprocess, Jn as uint64, Jr as _nonnegative, Jt as guid, K as ZodPipe, Kn as tuple, Kr as _multipleOf, Kt as float32, L as ZodNanoID, Ln as strictObject, Lr as _length, Lt as custom, M as ZodLazy, Mn as readonly, Mr as _coercedString, Mt as cidrv4, N as ZodLiteral, Nn as record, Nr as _endsWith, Nt as cidrv6, O as ZodIPv6, On as pipe, Or as _coercedBigint, Ot as base64url, P as ZodMAC, Pn as refine, Pr as _gt, Pt as codec, Q as ZodSet, Qn as url, Qr as _positive, Qt as httpUrl, R as ZodNever, Rn as string$1, Rr as _lowercase, Rt as date$1, S as ZodEnum, Si as NEVER, Sn as nullable, Sr as ZodISOTime, St as _null, T as ZodFunction, Ti as __exportAll, Tn as object, Tr as core_exports, Tt as any, U as ZodNumberFormat, Un as symbol, Ur as _mime, Ut as emoji, V as ZodNullable, Vn as success, Vr as _maxLength, Vt as e164, W as ZodObject, Wn as templateLiteral, Wr as _minLength, Wt as exactOptional, X as ZodReadonly, Xn as union, Xr as _normalize, Xt as hex, Y as ZodPromise, Yn as ulid, Yr as _nonpositive, Yt as hash, Z as ZodRecord, Zn as unknown, Zr as _overwrite, Zt as hostname, _ as ZodDefault, _i as prettifyError, _n as nan, _r as ZodError, _t as _catch, a as ZodBigInt, ai as _toUpperCase, an as ipv6, ar as decode, at as ZodTuple, b as ZodEmail, bi as util_exports, bn as never, br as ZodISODateTime, bt as _function, c as ZodCIDRv4, ci as $input, cn as keyof, cr as encodeAsync, ct as ZodURL, d as ZodCUID2, di as registry, dn as literal, dr as safeDecode, dt as ZodUnion, ei as _regex, en as int32, er as uuidv4, et as ZodStringFormat, f as ZodCatch, fi as locales_exports, fn as looseObject, fr as safeDecodeAsync, ft as ZodUnknown, g as ZodDate, gi as formatError, gn as meta, gr as safeParseAsync, gt as _ZodString, h as ZodCustomStringFormat, hi as flattenError, hn as map, hr as safeParse, ht as ZodXor, i as ZodBase64URL, ii as _toLowerCase, in as ipv4, ir as xor, it as ZodTransform, j as ZodKSUID, jn as promise, jr as _coercedNumber, jt as check, k as ZodIntersection, kn as prefault, kr as _coercedBoolean, kt as bigint$1, l as ZodCIDRv6, li as $output, ln as ksuid, lr as parse, lt as ZodUUID, m as ZodCustom, mi as regexes_exports, mn as mac, mr as safeEncodeAsync, mt as ZodXID, n as ZodArray, ni as _slugify, nn as intersection, nr as uuidv7, nt as ZodSymbol, o as ZodBigIntFormat, oi as _trim, on as json, or as decodeAsync, ot as ZodType, p as ZodCodec, pi as en_default, pn as looseRecord, pr as safeEncode, pt as ZodVoid, q as ZodPrefault, qn as uint32, qr as _negative, qt as float64, r as ZodBase64, ri as _startsWith, rn as invertCodec, rr as xid, rt as ZodTemplateLiteral, s as ZodBoolean, si as _uppercase, sn as jwt, sr as encode, st as ZodULID, t as ZodAny, ti as _size, tn as int64, tr as uuidv6, tt as ZodSuccess, u as ZodCUID, ui as globalRegistry, un as lazy, ur as parseAsync, ut as ZodUndefined, v as ZodDiscriminatedUnion, vi as treeifyError, vn as nanoid, vr as ZodRealError, vt as _default, w as ZodFile, wn as number$1, wr as checks_exports, wt as _void, x as ZodEmoji, xi as $brand, xn as nonoptional, xr as ZodISODuration, xt as _instanceof, y as ZodE164, yi as clone, yn as nativeEnum, yr as ZodISODate, yt as _enum, z as ZodNonOptional, zn as stringFormat, zr as _lt, zt as describe } from "./schemas-B63HZw_j.js";
import { createTypertRemoteInfo } from "@deepseek-ai/dsh-typert-protocol/remote-info";
//#region ../../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/compat.js
/** @deprecated Use the raw string literal codes instead, e.g. "invalid_type". */
const ZodIssueCode = {
	invalid_type: "invalid_type",
	too_big: "too_big",
	too_small: "too_small",
	invalid_format: "invalid_format",
	not_multiple_of: "not_multiple_of",
	unrecognized_keys: "unrecognized_keys",
	invalid_union: "invalid_union",
	invalid_key: "invalid_key",
	invalid_element: "invalid_element",
	invalid_value: "invalid_value",
	custom: "custom"
};
/** @deprecated Use `z.config(params)` instead. */
function setErrorMap(map) {
	config({ customError: map });
}
/** @deprecated Use `z.config()` instead. */
function getErrorMap() {
	return config().customError;
}
/** @deprecated Do not use. Stub definition, only included for zod-to-json-schema compatibility. */
var ZodFirstPartyTypeKind;
ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {});
//#endregion
//#region ../../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/from-json-schema.js
const z = {
	...schemas_exports,
	...checks_exports,
	iso: iso_exports
};
const RECOGNIZED_KEYS = /*@__PURE__*/ new Set([
	"$schema",
	"$ref",
	"$defs",
	"definitions",
	"$id",
	"id",
	"$comment",
	"$anchor",
	"$vocabulary",
	"$dynamicRef",
	"$dynamicAnchor",
	"type",
	"enum",
	"const",
	"anyOf",
	"oneOf",
	"allOf",
	"not",
	"properties",
	"required",
	"additionalProperties",
	"patternProperties",
	"propertyNames",
	"minProperties",
	"maxProperties",
	"items",
	"prefixItems",
	"additionalItems",
	"minItems",
	"maxItems",
	"uniqueItems",
	"contains",
	"minContains",
	"maxContains",
	"minLength",
	"maxLength",
	"pattern",
	"format",
	"minimum",
	"maximum",
	"exclusiveMinimum",
	"exclusiveMaximum",
	"multipleOf",
	"description",
	"default",
	"contentEncoding",
	"contentMediaType",
	"contentSchema",
	"unevaluatedItems",
	"unevaluatedProperties",
	"if",
	"then",
	"else",
	"dependentSchemas",
	"dependentRequired",
	"nullable",
	"readOnly"
]);
function detectVersion(schema, defaultTarget) {
	const $schema = schema.$schema;
	if ($schema === "https://json-schema.org/draft/2020-12/schema") return "draft-2020-12";
	if ($schema === "http://json-schema.org/draft-07/schema#") return "draft-7";
	if ($schema === "http://json-schema.org/draft-04/schema#") return "draft-4";
	return defaultTarget ?? "draft-2020-12";
}
function resolveRef(ref, ctx) {
	if (!ref.startsWith("#")) throw new Error("External $ref is not supported, only local refs (#/...) are allowed");
	const path = ref.slice(1).split("/").filter(Boolean);
	if (path.length === 0) return ctx.rootSchema;
	const defsKey = ctx.version === "draft-2020-12" ? "$defs" : "definitions";
	if (path[0] === defsKey) {
		const key = path[1];
		if (!key || !ctx.defs[key]) throw new Error(`Reference not found: ${ref}`);
		return ctx.defs[key];
	}
	throw new Error(`Reference not found: ${ref}`);
}
function convertBaseSchema(schema, ctx) {
	if (schema.not !== void 0) {
		if (typeof schema.not === "object" && Object.keys(schema.not).length === 0) return z.never();
		throw new Error("not is not supported in Zod (except { not: {} } for never)");
	}
	if (schema.unevaluatedItems !== void 0) throw new Error("unevaluatedItems is not supported");
	if (schema.unevaluatedProperties !== void 0) throw new Error("unevaluatedProperties is not supported");
	if (schema.if !== void 0 || schema.then !== void 0 || schema.else !== void 0) throw new Error("Conditional schemas (if/then/else) are not supported");
	if (schema.dependentSchemas !== void 0 || schema.dependentRequired !== void 0) throw new Error("dependentSchemas and dependentRequired are not supported");
	if (schema.$ref) {
		const refPath = schema.$ref;
		if (ctx.refs.has(refPath)) return ctx.refs.get(refPath);
		if (ctx.processing.has(refPath)) return z.lazy(() => {
			if (!ctx.refs.has(refPath)) throw new Error(`Circular reference not resolved: ${refPath}`);
			return ctx.refs.get(refPath);
		});
		ctx.processing.add(refPath);
		const zodSchema = convertSchema(resolveRef(refPath, ctx), ctx);
		ctx.refs.set(refPath, zodSchema);
		ctx.processing.delete(refPath);
		return zodSchema;
	}
	if (schema.enum !== void 0) {
		const enumValues = schema.enum;
		if (ctx.version === "openapi-3.0" && schema.nullable === true && enumValues.length === 1 && enumValues[0] === null) return z.null();
		if (enumValues.length === 0) return z.never();
		if (enumValues.length === 1) return z.literal(enumValues[0]);
		if (enumValues.every((v) => typeof v === "string")) return z.enum(enumValues);
		const literalSchemas = enumValues.map((v) => z.literal(v));
		if (literalSchemas.length < 2) return literalSchemas[0];
		return z.union([
			literalSchemas[0],
			literalSchemas[1],
			...literalSchemas.slice(2)
		]);
	}
	if (schema.const !== void 0) return z.literal(schema.const);
	const type = schema.type;
	if (Array.isArray(type)) {
		const typeSchemas = type.map((t) => {
			return convertBaseSchema({
				...schema,
				type: t
			}, ctx);
		});
		if (typeSchemas.length === 0) return z.never();
		if (typeSchemas.length === 1) return typeSchemas[0];
		return z.union(typeSchemas);
	}
	if (!type) return z.any();
	let zodSchema;
	switch (type) {
		case "string": {
			let stringSchema = z.string();
			if (schema.format) {
				const format = schema.format;
				if (format === "email") stringSchema = stringSchema.check(z.email());
				else if (format === "uri" || format === "uri-reference") stringSchema = stringSchema.check(z.url());
				else if (format === "uuid" || format === "guid") stringSchema = stringSchema.check(z.uuid());
				else if (format === "date-time") stringSchema = stringSchema.check(z.iso.datetime());
				else if (format === "date") stringSchema = stringSchema.check(z.iso.date());
				else if (format === "time") stringSchema = stringSchema.check(z.iso.time());
				else if (format === "duration") stringSchema = stringSchema.check(z.iso.duration());
				else if (format === "ipv4") stringSchema = stringSchema.check(z.ipv4());
				else if (format === "ipv6") stringSchema = stringSchema.check(z.ipv6());
				else if (format === "mac") stringSchema = stringSchema.check(z.mac());
				else if (format === "cidr") stringSchema = stringSchema.check(z.cidrv4());
				else if (format === "cidr-v6") stringSchema = stringSchema.check(z.cidrv6());
				else if (format === "base64") stringSchema = stringSchema.check(z.base64());
				else if (format === "base64url") stringSchema = stringSchema.check(z.base64url());
				else if (format === "e164") stringSchema = stringSchema.check(z.e164());
				else if (format === "jwt") stringSchema = stringSchema.check(z.jwt());
				else if (format === "emoji") stringSchema = stringSchema.check(z.emoji());
				else if (format === "nanoid") stringSchema = stringSchema.check(z.nanoid());
				else if (format === "cuid") stringSchema = stringSchema.check(z.cuid());
				else if (format === "cuid2") stringSchema = stringSchema.check(z.cuid2());
				else if (format === "ulid") stringSchema = stringSchema.check(z.ulid());
				else if (format === "xid") stringSchema = stringSchema.check(z.xid());
				else if (format === "ksuid") stringSchema = stringSchema.check(z.ksuid());
			}
			if (typeof schema.minLength === "number") stringSchema = stringSchema.min(schema.minLength);
			if (typeof schema.maxLength === "number") stringSchema = stringSchema.max(schema.maxLength);
			if (schema.pattern) stringSchema = stringSchema.regex(new RegExp(schema.pattern));
			zodSchema = stringSchema;
			break;
		}
		case "number":
		case "integer": {
			let numberSchema = type === "integer" ? z.number().int() : z.number();
			if (typeof schema.minimum === "number") numberSchema = numberSchema.min(schema.minimum);
			if (typeof schema.maximum === "number") numberSchema = numberSchema.max(schema.maximum);
			if (typeof schema.exclusiveMinimum === "number") numberSchema = numberSchema.gt(schema.exclusiveMinimum);
			else if (schema.exclusiveMinimum === true && typeof schema.minimum === "number") numberSchema = numberSchema.gt(schema.minimum);
			if (typeof schema.exclusiveMaximum === "number") numberSchema = numberSchema.lt(schema.exclusiveMaximum);
			else if (schema.exclusiveMaximum === true && typeof schema.maximum === "number") numberSchema = numberSchema.lt(schema.maximum);
			if (typeof schema.multipleOf === "number") numberSchema = numberSchema.multipleOf(schema.multipleOf);
			zodSchema = numberSchema;
			break;
		}
		case "boolean":
			zodSchema = z.boolean();
			break;
		case "null":
			zodSchema = z.null();
			break;
		case "object": {
			const shape = {};
			const properties = schema.properties || {};
			const requiredSet = new Set(schema.required || []);
			for (const [key, propSchema] of Object.entries(properties)) {
				const propZodSchema = convertSchema(propSchema, ctx);
				shape[key] = requiredSet.has(key) ? propZodSchema : propZodSchema.optional();
			}
			if (schema.propertyNames) {
				const keySchema = convertSchema(schema.propertyNames, ctx);
				const valueSchema = schema.additionalProperties && typeof schema.additionalProperties === "object" ? convertSchema(schema.additionalProperties, ctx) : z.any();
				if (Object.keys(shape).length === 0) {
					zodSchema = z.record(keySchema, valueSchema);
					break;
				}
				const objectSchema = z.object(shape).passthrough();
				const recordSchema = z.looseRecord(keySchema, valueSchema);
				zodSchema = z.intersection(objectSchema, recordSchema);
				break;
			}
			if (schema.patternProperties) {
				const patternProps = schema.patternProperties;
				const patternKeys = Object.keys(patternProps);
				const looseRecords = [];
				for (const pattern of patternKeys) {
					const patternValue = convertSchema(patternProps[pattern], ctx);
					const keySchema = z.string().regex(new RegExp(pattern));
					looseRecords.push(z.looseRecord(keySchema, patternValue));
				}
				const schemasToIntersect = [];
				if (Object.keys(shape).length > 0) schemasToIntersect.push(z.object(shape).passthrough());
				schemasToIntersect.push(...looseRecords);
				if (schemasToIntersect.length === 0) zodSchema = z.object({}).passthrough();
				else if (schemasToIntersect.length === 1) zodSchema = schemasToIntersect[0];
				else {
					let result = z.intersection(schemasToIntersect[0], schemasToIntersect[1]);
					for (let i = 2; i < schemasToIntersect.length; i++) result = z.intersection(result, schemasToIntersect[i]);
					zodSchema = result;
				}
				break;
			}
			const objectSchema = z.object(shape);
			if (schema.additionalProperties === false) zodSchema = objectSchema.strict();
			else if (typeof schema.additionalProperties === "object") zodSchema = objectSchema.catchall(convertSchema(schema.additionalProperties, ctx));
			else zodSchema = objectSchema.passthrough();
			break;
		}
		case "array": {
			const prefixItems = schema.prefixItems;
			const items = schema.items;
			if (prefixItems && Array.isArray(prefixItems)) {
				const tupleItems = prefixItems.map((item) => convertSchema(item, ctx));
				const rest = items && typeof items === "object" && !Array.isArray(items) ? convertSchema(items, ctx) : void 0;
				if (rest) zodSchema = z.tuple(tupleItems).rest(rest);
				else zodSchema = z.tuple(tupleItems);
				if (typeof schema.minItems === "number") zodSchema = zodSchema.check(z.minLength(schema.minItems));
				if (typeof schema.maxItems === "number") zodSchema = zodSchema.check(z.maxLength(schema.maxItems));
			} else if (Array.isArray(items)) {
				const tupleItems = items.map((item) => convertSchema(item, ctx));
				const rest = schema.additionalItems && typeof schema.additionalItems === "object" ? convertSchema(schema.additionalItems, ctx) : void 0;
				if (rest) zodSchema = z.tuple(tupleItems).rest(rest);
				else zodSchema = z.tuple(tupleItems);
				if (typeof schema.minItems === "number") zodSchema = zodSchema.check(z.minLength(schema.minItems));
				if (typeof schema.maxItems === "number") zodSchema = zodSchema.check(z.maxLength(schema.maxItems));
			} else if (items !== void 0) {
				const element = convertSchema(items, ctx);
				let arraySchema = z.array(element);
				if (typeof schema.minItems === "number") arraySchema = arraySchema.min(schema.minItems);
				if (typeof schema.maxItems === "number") arraySchema = arraySchema.max(schema.maxItems);
				zodSchema = arraySchema;
			} else zodSchema = z.array(z.any());
			break;
		}
		default: throw new Error(`Unsupported type: ${type}`);
	}
	return zodSchema;
}
function convertSchema(schema, ctx) {
	if (typeof schema === "boolean") return schema ? z.any() : z.never();
	let baseSchema = convertBaseSchema(schema, ctx);
	const hasExplicitType = schema.type || schema.enum !== void 0 || schema.const !== void 0;
	if (schema.anyOf && Array.isArray(schema.anyOf)) {
		const options = schema.anyOf.map((s) => convertSchema(s, ctx));
		const anyOfUnion = z.union(options);
		baseSchema = hasExplicitType ? z.intersection(baseSchema, anyOfUnion) : anyOfUnion;
	}
	if (schema.oneOf && Array.isArray(schema.oneOf)) {
		const options = schema.oneOf.map((s) => convertSchema(s, ctx));
		const oneOfUnion = z.xor(options);
		baseSchema = hasExplicitType ? z.intersection(baseSchema, oneOfUnion) : oneOfUnion;
	}
	if (schema.allOf && Array.isArray(schema.allOf)) if (schema.allOf.length === 0) baseSchema = hasExplicitType ? baseSchema : z.any();
	else {
		let result = hasExplicitType ? baseSchema : convertSchema(schema.allOf[0], ctx);
		const startIdx = hasExplicitType ? 0 : 1;
		for (let i = startIdx; i < schema.allOf.length; i++) result = z.intersection(result, convertSchema(schema.allOf[i], ctx));
		baseSchema = result;
	}
	if (schema.nullable === true && ctx.version === "openapi-3.0") baseSchema = z.nullable(baseSchema);
	if (schema.readOnly === true) baseSchema = z.readonly(baseSchema);
	if (schema.default !== void 0) baseSchema = baseSchema.default(schema.default);
	const extraMeta = {};
	for (const key of [
		"$id",
		"id",
		"$comment",
		"$anchor",
		"$vocabulary",
		"$dynamicRef",
		"$dynamicAnchor"
	]) if (key in schema) extraMeta[key] = schema[key];
	for (const key of [
		"contentEncoding",
		"contentMediaType",
		"contentSchema"
	]) if (key in schema) extraMeta[key] = schema[key];
	for (const key of Object.keys(schema)) if (!RECOGNIZED_KEYS.has(key)) extraMeta[key] = schema[key];
	if (Object.keys(extraMeta).length > 0) ctx.registry.add(baseSchema, extraMeta);
	if (schema.description) baseSchema = baseSchema.describe(schema.description);
	return baseSchema;
}
/**
* Converts a JSON Schema to a Zod schema. This function should be considered semi-experimental. It's behavior is liable to change. */
function fromJSONSchema(schema, params) {
	if (typeof schema === "boolean") return schema ? z.any() : z.never();
	let normalized;
	try {
		normalized = JSON.parse(JSON.stringify(schema));
	} catch {
		throw new Error("fromJSONSchema input is not valid JSON (possibly cyclic); use $defs/$ref for recursive schemas");
	}
	const ctx = {
		version: detectVersion(normalized, params?.defaultTarget),
		defs: normalized.$defs || normalized.definitions || {},
		refs: /* @__PURE__ */ new Map(),
		processing: /* @__PURE__ */ new Set(),
		rootSchema: normalized,
		registry: params?.registry ?? globalRegistry
	};
	return convertSchema(normalized, ctx);
}
//#endregion
//#region ../../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/coerce.js
var coerce_exports = /* @__PURE__ */ __exportAll({
	bigint: () => bigint,
	boolean: () => boolean,
	date: () => date,
	number: () => number,
	string: () => string
});
function string(params) {
	return _coercedString(ZodString, params);
}
function number(params) {
	return _coercedNumber(ZodNumber, params);
}
function boolean(params) {
	return _coercedBoolean(ZodBoolean, params);
}
function bigint(params) {
	return _coercedBigint(ZodBigInt, params);
}
function date(params) {
	return _coercedDate(ZodDate, params);
}
//#endregion
//#region ../../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/external.js
var external_exports = /* @__PURE__ */ __exportAll({
	$brand: () => $brand,
	$input: () => $input,
	$output: () => $output,
	NEVER: () => NEVER,
	TimePrecision: () => TimePrecision,
	ZodAny: () => ZodAny,
	ZodArray: () => ZodArray,
	ZodBase64: () => ZodBase64,
	ZodBase64URL: () => ZodBase64URL,
	ZodBigInt: () => ZodBigInt,
	ZodBigIntFormat: () => ZodBigIntFormat,
	ZodBoolean: () => ZodBoolean,
	ZodCIDRv4: () => ZodCIDRv4,
	ZodCIDRv6: () => ZodCIDRv6,
	ZodCUID: () => ZodCUID,
	ZodCUID2: () => ZodCUID2,
	ZodCatch: () => ZodCatch,
	ZodCodec: () => ZodCodec,
	ZodCustom: () => ZodCustom,
	ZodCustomStringFormat: () => ZodCustomStringFormat,
	ZodDate: () => ZodDate,
	ZodDefault: () => ZodDefault,
	ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
	ZodE164: () => ZodE164,
	ZodEmail: () => ZodEmail,
	ZodEmoji: () => ZodEmoji,
	ZodEnum: () => ZodEnum,
	ZodError: () => ZodError,
	ZodExactOptional: () => ZodExactOptional,
	ZodFile: () => ZodFile,
	ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
	ZodFunction: () => ZodFunction,
	ZodGUID: () => ZodGUID,
	ZodIPv4: () => ZodIPv4,
	ZodIPv6: () => ZodIPv6,
	ZodISODate: () => ZodISODate,
	ZodISODateTime: () => ZodISODateTime,
	ZodISODuration: () => ZodISODuration,
	ZodISOTime: () => ZodISOTime,
	ZodIntersection: () => ZodIntersection,
	ZodIssueCode: () => ZodIssueCode,
	ZodJWT: () => ZodJWT,
	ZodKSUID: () => ZodKSUID,
	ZodLazy: () => ZodLazy,
	ZodLiteral: () => ZodLiteral,
	ZodMAC: () => ZodMAC,
	ZodMap: () => ZodMap,
	ZodNaN: () => ZodNaN,
	ZodNanoID: () => ZodNanoID,
	ZodNever: () => ZodNever,
	ZodNonOptional: () => ZodNonOptional,
	ZodNull: () => ZodNull,
	ZodNullable: () => ZodNullable,
	ZodNumber: () => ZodNumber,
	ZodNumberFormat: () => ZodNumberFormat,
	ZodObject: () => ZodObject,
	ZodOptional: () => ZodOptional,
	ZodPipe: () => ZodPipe,
	ZodPrefault: () => ZodPrefault,
	ZodPreprocess: () => ZodPreprocess,
	ZodPromise: () => ZodPromise,
	ZodReadonly: () => ZodReadonly,
	ZodRealError: () => ZodRealError,
	ZodRecord: () => ZodRecord,
	ZodSet: () => ZodSet,
	ZodString: () => ZodString,
	ZodStringFormat: () => ZodStringFormat,
	ZodSuccess: () => ZodSuccess,
	ZodSymbol: () => ZodSymbol,
	ZodTemplateLiteral: () => ZodTemplateLiteral,
	ZodTransform: () => ZodTransform,
	ZodTuple: () => ZodTuple,
	ZodType: () => ZodType,
	ZodULID: () => ZodULID,
	ZodURL: () => ZodURL,
	ZodUUID: () => ZodUUID,
	ZodUndefined: () => ZodUndefined,
	ZodUnion: () => ZodUnion,
	ZodUnknown: () => ZodUnknown,
	ZodVoid: () => ZodVoid,
	ZodXID: () => ZodXID,
	ZodXor: () => ZodXor,
	_ZodString: () => _ZodString,
	_default: () => _default,
	_function: () => _function,
	any: () => any,
	array: () => array,
	base64: () => base64,
	base64url: () => base64url,
	bigint: () => bigint$1,
	boolean: () => boolean$1,
	catch: () => _catch,
	check: () => check,
	cidrv4: () => cidrv4,
	cidrv6: () => cidrv6,
	clone: () => clone,
	codec: () => codec,
	coerce: () => coerce_exports,
	config: () => config,
	core: () => core_exports,
	cuid: () => cuid,
	cuid2: () => cuid2,
	custom: () => custom,
	date: () => date$1,
	decode: () => decode,
	decodeAsync: () => decodeAsync,
	describe: () => describe,
	discriminatedUnion: () => discriminatedUnion,
	e164: () => e164,
	email: () => email,
	emoji: () => emoji,
	encode: () => encode,
	encodeAsync: () => encodeAsync,
	endsWith: () => _endsWith,
	enum: () => _enum,
	exactOptional: () => exactOptional,
	file: () => file,
	flattenError: () => flattenError,
	float32: () => float32,
	float64: () => float64,
	formatError: () => formatError,
	fromJSONSchema: () => fromJSONSchema,
	function: () => _function,
	getErrorMap: () => getErrorMap,
	globalRegistry: () => globalRegistry,
	gt: () => _gt,
	gte: () => _gte,
	guid: () => guid,
	hash: () => hash,
	hex: () => hex,
	hostname: () => hostname,
	httpUrl: () => httpUrl,
	includes: () => _includes,
	instanceof: () => _instanceof,
	int: () => int,
	int32: () => int32,
	int64: () => int64,
	intersection: () => intersection,
	invertCodec: () => invertCodec,
	ipv4: () => ipv4,
	ipv6: () => ipv6,
	iso: () => iso_exports,
	json: () => json,
	jwt: () => jwt,
	keyof: () => keyof,
	ksuid: () => ksuid,
	lazy: () => lazy,
	length: () => _length,
	literal: () => literal,
	locales: () => locales_exports,
	looseObject: () => looseObject,
	looseRecord: () => looseRecord,
	lowercase: () => _lowercase,
	lt: () => _lt,
	lte: () => _lte,
	mac: () => mac,
	map: () => map,
	maxLength: () => _maxLength,
	maxSize: () => _maxSize,
	meta: () => meta,
	mime: () => _mime,
	minLength: () => _minLength,
	minSize: () => _minSize,
	multipleOf: () => _multipleOf,
	nan: () => nan,
	nanoid: () => nanoid,
	nativeEnum: () => nativeEnum,
	negative: () => _negative,
	never: () => never,
	nonnegative: () => _nonnegative,
	nonoptional: () => nonoptional,
	nonpositive: () => _nonpositive,
	normalize: () => _normalize,
	null: () => _null,
	nullable: () => nullable,
	nullish: () => nullish,
	number: () => number$1,
	object: () => object,
	optional: () => optional,
	overwrite: () => _overwrite,
	parse: () => parse,
	parseAsync: () => parseAsync,
	partialRecord: () => partialRecord,
	pipe: () => pipe,
	positive: () => _positive,
	prefault: () => prefault,
	preprocess: () => preprocess,
	prettifyError: () => prettifyError,
	promise: () => promise,
	property: () => _property,
	readonly: () => readonly,
	record: () => record,
	refine: () => refine,
	regex: () => _regex,
	regexes: () => regexes_exports,
	registry: () => registry,
	safeDecode: () => safeDecode,
	safeDecodeAsync: () => safeDecodeAsync,
	safeEncode: () => safeEncode,
	safeEncodeAsync: () => safeEncodeAsync,
	safeParse: () => safeParse,
	safeParseAsync: () => safeParseAsync,
	set: () => set,
	setErrorMap: () => setErrorMap,
	size: () => _size,
	slugify: () => _slugify,
	startsWith: () => _startsWith,
	strictObject: () => strictObject,
	string: () => string$1,
	stringFormat: () => stringFormat,
	stringbool: () => stringbool,
	success: () => success,
	superRefine: () => superRefine,
	symbol: () => symbol,
	templateLiteral: () => templateLiteral,
	toJSONSchema: () => toJSONSchema,
	toLowerCase: () => _toLowerCase,
	toUpperCase: () => _toUpperCase,
	transform: () => transform,
	treeifyError: () => treeifyError,
	trim: () => _trim,
	tuple: () => tuple,
	uint32: () => uint32,
	uint64: () => uint64,
	ulid: () => ulid,
	undefined: () => _undefined,
	union: () => union,
	unknown: () => unknown,
	uppercase: () => _uppercase,
	url: () => url,
	util: () => util_exports,
	uuid: () => uuid,
	uuidv4: () => uuidv4,
	uuidv6: () => uuidv6,
	uuidv7: () => uuidv7,
	void: () => _void,
	xid: () => xid,
	xor: () => xor
});
config(en_default());
//#endregion
//#region lib/typert.host.js
let dsh_media_mediaSuite_accounts_result$schema$value;
const dsh_media_mediaSuite_accounts_result$schema = () => dsh_media_mediaSuite_accounts_result$schema$value ??= array(object({
	"id": string$1().readonly(),
	"demo": union([_undefined(), literal(true)]).readonly().optional().describe("Set on the sample accounts `loadDemo` creates; they hold made-up data and are never fetched."),
	"loginProfile": union([_undefined(), string$1()]).readonly().optional().describe("Browser profile that keeps this own account's login, set when the account is connected by scanning. Without it the account uses the platform's shared profile, which holds one login at a time."),
	"createdAt": string$1().readonly().describe("ISO-8601 instants."),
	"updatedAt": string$1().readonly(),
	"platform": string$1().readonly(),
	"role": union([literal("own"), literal("benchmark")]).readonly(),
	"name": string$1().readonly().describe("Display name chosen by the user."),
	"profileUrl": string$1().readonly().describe("Public profile URL used by scraping."),
	"niche": string$1().readonly().describe("Content field, such as `职场成长` or `美食探店`, used by AI prompts."),
	"notes": string$1().readonly().describe("Free-form notes for AI prompts: audience, style, goals."),
	"monitor": object({
		"enabled": boolean$1().readonly(),
		"intervalMinutes": number$1().readonly().describe("Minutes between automatic scrapes; the Host clamps to its configured minimum.")
	}).readonly(),
	"avatarUrl": union([_undefined(), string$1()]).readonly().optional().describe("The account's avatar image on the platform (an https URL), read when scanning in and refreshed by each update.")
}));
let dsh_media_mediaSuite_analysisReports_parameter_0$schema$value;
const dsh_media_mediaSuite_analysisReports_parameter_0$schema = () => dsh_media_mediaSuite_analysisReports_parameter_0$schema$value ??= string$1();
let dsh_media_mediaSuite_analysisReports_result$schema$value;
const dsh_media_mediaSuite_analysisReports_result$schema = () => dsh_media_mediaSuite_analysisReports_result$schema$value ??= array(object({
	"id": string$1().readonly(),
	"accountId": string$1().readonly(),
	"createdAt": string$1().readonly(),
	"model": string$1().readonly(),
	"summary": string$1().readonly(),
	"strengths": array(string$1()).readonly(),
	"items": array(object({
		"area": string$1().readonly().describe("Area such as `发布节奏`, `标题封面`, `互动转化`, `内容方向`."),
		"finding": string$1().readonly(),
		"evidence": string$1().readonly().describe("Numbers or posts that support the finding."),
		"action": string$1().readonly().describe("Concrete next step."),
		"priority": union([
			literal("high"),
			literal("medium"),
			literal("low")
		]).readonly()
	})).readonly()
}));
let dsh_media_mediaSuite_analyze_parameter_0$schema$value;
const dsh_media_mediaSuite_analyze_parameter_0$schema = () => dsh_media_mediaSuite_analyze_parameter_0$schema$value ??= string$1();
let dsh_media_mediaSuite_analyze_result$schema$value;
const dsh_media_mediaSuite_analyze_result$schema = () => dsh_media_mediaSuite_analyze_result$schema$value ??= object({
	"id": string$1().readonly(),
	"accountId": string$1().readonly(),
	"createdAt": string$1().readonly(),
	"model": string$1().readonly(),
	"summary": string$1().readonly(),
	"strengths": array(string$1()).readonly(),
	"items": array(object({
		"area": string$1().readonly().describe("Area such as `发布节奏`, `标题封面`, `互动转化`, `内容方向`."),
		"finding": string$1().readonly(),
		"evidence": string$1().readonly().describe("Numbers or posts that support the finding."),
		"action": string$1().readonly().describe("Concrete next step."),
		"priority": union([
			literal("high"),
			literal("medium"),
			literal("low")
		]).readonly()
	})).readonly()
});
let dsh_media_mediaSuite_brief_result$schema$value;
const dsh_media_mediaSuite_brief_result$schema = () => dsh_media_mediaSuite_brief_result$schema$value ??= object({
	"brief": union([_undefined(), object({
		"id": string$1().readonly(),
		"day": string$1().readonly().describe("China day the brief is for."),
		"createdAt": string$1().readonly(),
		"model": string$1().readonly().describe("`provider/model` that wrote it."),
		"dataAt": union([_undefined(), string$1()]).readonly().optional().describe("Newest capture the brief saw."),
		"items": array(object({
			"kind": union([
				literal("alert"),
				literal("fact"),
				literal("action"),
				literal("topic")
			]).readonly(),
			"text": string$1().readonly(),
			"accountId": union([_undefined(), string$1()]).readonly().optional().describe("The account the line is about, when it names one of the user's accounts."),
			"platform": union([_undefined(), string$1()]).readonly().optional().describe("Platform name the line is about, as the model wrote it."),
			"detail": union([_undefined(), string$1()]).readonly().optional().describe("The longer explanation shown when the line is opened: the numbers behind it and what to do."),
			"post": union([_undefined(), object({
				"accountId": string$1().readonly(),
				"postId": string$1().readonly()
			})]).readonly().optional().describe("The work the line is about, when its title matches one of the recent posts."),
			"metric": union([
				_undefined(),
				literal("followers"),
				literal("fansNet"),
				literal("views"),
				literal("likes"),
				literal("comments"),
				literal("shares"),
				literal("posts")
			]).readonly().optional().describe("The 全网 counter the line is about, so the page can show its numbers.")
		})).readonly()
	})]).readonly().optional(),
	"running": boolean$1().readonly().describe("A brief is being written now; `partial` holds its finished lines."),
	"partial": array(object({
		"kind": union([
			literal("alert"),
			literal("fact"),
			literal("action"),
			literal("topic")
		]).readonly(),
		"text": string$1().readonly(),
		"accountId": union([_undefined(), string$1()]).readonly().optional().describe("The account the line is about, when it names one of the user's accounts."),
		"platform": union([_undefined(), string$1()]).readonly().optional().describe("Platform name the line is about, as the model wrote it."),
		"detail": union([_undefined(), string$1()]).readonly().optional().describe("The longer explanation shown when the line is opened: the numbers behind it and what to do."),
		"post": union([_undefined(), object({
			"accountId": string$1().readonly(),
			"postId": string$1().readonly()
		})]).readonly().optional().describe("The work the line is about, when its title matches one of the recent posts."),
		"metric": union([
			_undefined(),
			literal("followers"),
			literal("fansNet"),
			literal("views"),
			literal("likes"),
			literal("comments"),
			literal("shares"),
			literal("posts")
		]).readonly().optional().describe("The 全网 counter the line is about, so the page can show its numbers.")
	})).readonly(),
	"problem": union([_undefined(), string$1()]).readonly().optional().describe("Why the last attempt failed, until the next one starts."),
	"scheduleAt": string$1().readonly().describe("China time the daily brief is written at, such as `09:00`.")
});
let dsh_media_mediaSuite_browserClose_parameter_0$schema$value;
const dsh_media_mediaSuite_browserClose_parameter_0$schema = () => dsh_media_mediaSuite_browserClose_parameter_0$schema$value ??= string$1();
let dsh_media_mediaSuite_browserClose_result$schema$value;
const dsh_media_mediaSuite_browserClose_result$schema = () => dsh_media_mediaSuite_browserClose_result$schema$value ??= _void();
let dsh_media_mediaSuite_browserFrames_parameter_0$schema$value;
const dsh_media_mediaSuite_browserFrames_parameter_0$schema = () => dsh_media_mediaSuite_browserFrames_parameter_0$schema$value ??= string$1();
let dsh_media_mediaSuite_browserFrames_result$schema$value;
const dsh_media_mediaSuite_browserFrames_result$schema = () => dsh_media_mediaSuite_browserFrames_result$schema$value ??= union([
	object({
		"kind": literal("frame").readonly(),
		"data": string$1().readonly(),
		"width": number$1().readonly(),
		"height": number$1().readonly(),
		"url": string$1().readonly(),
		"title": string$1().readonly(),
		"loading": union([
			_undefined(),
			literal(false),
			literal(true)
		]).readonly().optional().describe("Whether the page is still loading (Chrome's own loading state of the main frame), for the panel's progress bar.")
	}),
	object({
		"kind": literal("login").readonly(),
		"state": union([
			literal("unknown"),
			literal("logged-in"),
			literal("logged-out")
		]).readonly()
	}),
	object({
		"kind": literal("qr").readonly(),
		"data": union([_undefined(), string$1()]).readonly().optional(),
		"width": number$1().readonly(),
		"height": number$1().readonly()
	}),
	object({
		"kind": literal("identity").readonly(),
		"identity": object({
			"platform": string$1().readonly(),
			"name": string$1().readonly().describe("Platform nickname."),
			"profileUrl": string$1().readonly().describe("Canonical profile URL usable as MediaAccountDraft.profileUrl."),
			"avatarUrl": union([_undefined(), string$1()]).readonly().optional().describe("Avatar image URL, when the platform showed one."),
			"existingAccountId": union([_undefined(), string$1()]).readonly().optional().describe("Existing own account with the same platform and profile URL, if any.")
		}).readonly()
	}),
	object({
		"kind": literal("closed").readonly(),
		"reason": string$1().readonly()
	})
]);
let dsh_media_mediaSuite_browserInput_parameter_0$schema$value;
const dsh_media_mediaSuite_browserInput_parameter_0$schema = () => dsh_media_mediaSuite_browserInput_parameter_0$schema$value ??= string$1();
let dsh_media_mediaSuite_browserInput_parameter_1$schema$value;
const dsh_media_mediaSuite_browserInput_parameter_1$schema = () => dsh_media_mediaSuite_browserInput_parameter_1$schema$value ??= union([
	object({
		"kind": literal("click").readonly(),
		"x": number$1().readonly(),
		"y": number$1().readonly(),
		"button": union([literal("left"), literal("right")]).readonly()
	}),
	object({
		"kind": literal("down").readonly(),
		"x": number$1().readonly(),
		"y": number$1().readonly(),
		"button": union([literal("left"), literal("right")]).readonly()
	}),
	object({
		"kind": literal("up").readonly(),
		"x": number$1().readonly(),
		"y": number$1().readonly(),
		"button": union([literal("left"), literal("right")]).readonly()
	}),
	object({
		"kind": literal("move").readonly(),
		"x": number$1().readonly(),
		"y": number$1().readonly()
	}),
	object({
		"kind": literal("wheel").readonly(),
		"x": number$1().readonly(),
		"y": number$1().readonly(),
		"deltaX": number$1().readonly(),
		"deltaY": number$1().readonly()
	}),
	object({
		"kind": literal("key").readonly(),
		"key": string$1().readonly()
	}),
	object({
		"kind": literal("text").readonly(),
		"text": string$1().readonly()
	}),
	object({
		"kind": literal("navigate").readonly(),
		"url": string$1().readonly()
	}),
	object({ "kind": literal("back").readonly() }),
	object({ "kind": literal("reload").readonly() })
]);
let dsh_media_mediaSuite_browserInput_result$schema$value;
const dsh_media_mediaSuite_browserInput_result$schema = () => dsh_media_mediaSuite_browserInput_result$schema$value ??= _void();
let dsh_media_mediaSuite_browserOpen_parameter_0$schema$value;
const dsh_media_mediaSuite_browserOpen_parameter_0$schema = () => dsh_media_mediaSuite_browserOpen_parameter_0$schema$value ??= string$1();
let dsh_media_mediaSuite_browserOpen_parameter_1$schema$value;
const dsh_media_mediaSuite_browserOpen_parameter_1$schema = () => dsh_media_mediaSuite_browserOpen_parameter_1$schema$value ??= union([_undefined(), string$1()]);
let dsh_media_mediaSuite_browserOpen_parameter_2$schema$value;
const dsh_media_mediaSuite_browserOpen_parameter_2$schema = () => dsh_media_mediaSuite_browserOpen_parameter_2$schema$value ??= union([_undefined(), string$1()]);
let dsh_media_mediaSuite_browserOpen_parameter_3$schema$value;
const dsh_media_mediaSuite_browserOpen_parameter_3$schema = () => dsh_media_mediaSuite_browserOpen_parameter_3$schema$value ??= union([
	_undefined(),
	literal(false),
	literal(true)
]);
let dsh_media_mediaSuite_browserOpen_result$schema$value;
const dsh_media_mediaSuite_browserOpen_result$schema = () => dsh_media_mediaSuite_browserOpen_result$schema$value ??= object({
	"id": string$1().readonly(),
	"platform": string$1().readonly(),
	"width": number$1().readonly(),
	"height": number$1().readonly()
});
let dsh_media_mediaSuite_clearDemo_result$schema$value;
const dsh_media_mediaSuite_clearDemo_result$schema = () => dsh_media_mediaSuite_clearDemo_result$schema$value ??= number$1();
let dsh_media_mediaSuite_dashboard_parameter_0$schema$value;
const dsh_media_mediaSuite_dashboard_parameter_0$schema = () => dsh_media_mediaSuite_dashboard_parameter_0$schema$value ??= string$1();
let dsh_media_mediaSuite_dashboard_parameter_1$schema$value;
const dsh_media_mediaSuite_dashboard_parameter_1$schema = () => dsh_media_mediaSuite_dashboard_parameter_1$schema$value ??= number$1();
let dsh_media_mediaSuite_dashboard_result$schema$value;
const dsh_media_mediaSuite_dashboard_result$schema = () => dsh_media_mediaSuite_dashboard_result$schema$value ??= object({
	"account": object({
		"id": string$1().readonly(),
		"demo": union([_undefined(), literal(true)]).readonly().optional().describe("Set on the sample accounts `loadDemo` creates; they hold made-up data and are never fetched."),
		"loginProfile": union([_undefined(), string$1()]).readonly().optional().describe("Browser profile that keeps this own account's login, set when the account is connected by scanning. Without it the account uses the platform's shared profile, which holds one login at a time."),
		"createdAt": string$1().readonly().describe("ISO-8601 instants."),
		"updatedAt": string$1().readonly(),
		"platform": string$1().readonly(),
		"role": union([literal("own"), literal("benchmark")]).readonly(),
		"name": string$1().readonly().describe("Display name chosen by the user."),
		"profileUrl": string$1().readonly().describe("Public profile URL used by scraping."),
		"niche": string$1().readonly().describe("Content field, such as `职场成长` or `美食探店`, used by AI prompts."),
		"notes": string$1().readonly().describe("Free-form notes for AI prompts: audience, style, goals."),
		"monitor": object({
			"enabled": boolean$1().readonly(),
			"intervalMinutes": number$1().readonly().describe("Minutes between automatic scrapes; the Host clamps to its configured minimum.")
		}).readonly(),
		"avatarUrl": union([_undefined(), string$1()]).readonly().optional().describe("The account's avatar image on the platform (an https URL), read when scanning in and refreshed by each update.")
	}).readonly(),
	"platform": object({
		"search": boolean$1().readonly().optional().describe("Whether the platform can search posts, filled in by the registry from the adapter; adapters omit it."),
		"id": string$1().readonly(),
		"displayName": string$1().readonly().describe("Display name in the platform's own language, such as `小红书`."),
		"loginUrl": string$1().readonly().describe("Home page the embedded browser opens for login."),
		"scrape": boolean$1().readonly().describe("Whether the adapter scrapes through the embedded browser."),
		"import": boolean$1().readonly().describe("Whether the adapter maps creator-backend export files."),
		"importHint": string$1().readonly().describe("Short hint describing which export file the user should upload."),
		"profileUrlExample": string$1().readonly().describe("Example profile URL shown as the input placeholder."),
		"metrics": union([_undefined(), object({
			"views": union([_undefined(), string$1()]).readonly().optional(),
			"likes": union([_undefined(), string$1()]).readonly().optional(),
			"comments": union([_undefined(), string$1()]).readonly().optional(),
			"shares": union([_undefined(), string$1()]).readonly().optional(),
			"collects": union([_undefined(), string$1()]).readonly().optional()
		})]).readonly().optional().describe("The platform's own names for the post counters, such as `阅读` for a 公众号's `views`. Counters the platform does not report are left out, so the page and the tools never show a counter that is always empty."),
		"noun": union([_undefined(), string$1()]).readonly().optional().describe("What one post is called on the platform, such as `视频`, `笔记` or `文章`."),
		"color": union([_undefined(), string$1()]).readonly().optional().describe("Brand color (CSS), for the platform's tints and its series in charts; a platform added later brings its own."),
		"beta": union([
			_undefined(),
			literal(false),
			literal(true)
		]).readonly().optional().describe("Set while the adapter has not been checked against a real logged-in account; the page marks the platform as a trial.")
	}).readonly(),
	"health": object({
		"state": union([
			literal("pending"),
			literal("stale"),
			literal("login-required"),
			literal("failing"),
			literal("ok")
		]).readonly(),
		"updatedAt": union([_undefined(), string$1()]).readonly().optional().describe("ISO-8601 instant of the newest stored counters, when any."),
		"errorCode": union([_undefined(), string$1()]).readonly().optional().describe("Failure code of the last run, when it failed."),
		"message": union([_undefined(), string$1()]).readonly().optional().describe("Failure message of the last run, when it failed, in Chinese."),
		"nextRunAt": union([_undefined(), string$1()]).readonly().optional().describe("ISO-8601 instant of the next automatic update, when monitoring is on."),
		"monitored": boolean$1().readonly().describe("Whether automatic updates are on.")
	}).readonly(),
	"days": number$1().readonly().describe("Window length in days, and its first and last China days; windows end yesterday, as the platforms report whole days."),
	"from": string$1().readonly(),
	"to": string$1().readonly(),
	"headline": array(object({
		"key": string$1().readonly().describe("Stable key: `views`, `likes`, `comments`, `shares`, `collects`, `posts`, `engagement`, `profileViews`, `followers`, `fansNet`, …"),
		"label": string$1().readonly().describe("Display name in the platform's words, such as `阅读量`."),
		"unit": union([
			literal("count"),
			literal("percent"),
			literal("seconds")
		]).readonly(),
		"value": union([_undefined(), number$1()]).readonly().optional().describe("Total over the window, or the newest value for a running total such as followers; undefined when unknown."),
		"change": union([_undefined(), number$1()]).readonly().optional().describe("Relative change against the window of the same length before it, such as 0.12 for +12%; undefined when unknown."),
		"previous": union([_undefined(), number$1()]).readonly().optional().describe("Value over the window of the same length before it; undefined when unknown."),
		"daily": array(object({
			"day": string$1().readonly().describe("`YYYY-MM-DD`, China time."),
			"value": number$1().readonly()
		})).readonly().describe("Daily values inside the window, oldest first; days without data are left out."),
		"hint": string$1().readonly().describe("How the number is counted, in Chinese.")
	})).readonly().describe("The 7-day headline counters of 数据总览, independent of the chosen window: up to five, the radar's axes."),
	"works": array(object({
		"key": string$1().readonly().describe("Stable key: `views`, `likes`, `comments`, `shares`, `collects`, `posts`, `engagement`, `profileViews`, `followers`, `fansNet`, …"),
		"label": string$1().readonly().describe("Display name in the platform's words, such as `阅读量`."),
		"unit": union([
			literal("count"),
			literal("percent"),
			literal("seconds")
		]).readonly(),
		"value": union([_undefined(), number$1()]).readonly().optional().describe("Total over the window, or the newest value for a running total such as followers; undefined when unknown."),
		"change": union([_undefined(), number$1()]).readonly().optional().describe("Relative change against the window of the same length before it, such as 0.12 for +12%; undefined when unknown."),
		"previous": union([_undefined(), number$1()]).readonly().optional().describe("Value over the window of the same length before it; undefined when unknown."),
		"daily": array(object({
			"day": string$1().readonly().describe("`YYYY-MM-DD`, China time."),
			"value": number$1().readonly()
		})).readonly().describe("Daily values inside the window, oldest first; days without data are left out."),
		"hint": string$1().readonly().describe("How the number is counted, in Chinese.")
	})).readonly().describe("Counters of 作品数据 over the chosen window."),
	"fans": array(object({
		"key": string$1().readonly().describe("Stable key: `views`, `likes`, `comments`, `shares`, `collects`, `posts`, `engagement`, `profileViews`, `followers`, `fansNet`, …"),
		"label": string$1().readonly().describe("Display name in the platform's words, such as `阅读量`."),
		"unit": union([
			literal("count"),
			literal("percent"),
			literal("seconds")
		]).readonly(),
		"value": union([_undefined(), number$1()]).readonly().optional().describe("Total over the window, or the newest value for a running total such as followers; undefined when unknown."),
		"change": union([_undefined(), number$1()]).readonly().optional().describe("Relative change against the window of the same length before it, such as 0.12 for +12%; undefined when unknown."),
		"previous": union([_undefined(), number$1()]).readonly().optional().describe("Value over the window of the same length before it; undefined when unknown."),
		"daily": array(object({
			"day": string$1().readonly().describe("`YYYY-MM-DD`, China time."),
			"value": number$1().readonly()
		})).readonly().describe("Daily values inside the window, oldest first; days without data are left out."),
		"hint": string$1().readonly().describe("How the number is counted, in Chinese.")
	})).readonly().describe("Counters of 粉丝数据 over the chosen window."),
	"top": array(object({
		"post": object({
			"accountId": string$1().readonly(),
			"postId": string$1().readonly().describe("Platform post id, or a stable hash of the URL/title when the platform exposes none."),
			"title": string$1().readonly(),
			"url": union([_undefined(), string$1()]).readonly().optional(),
			"publishedAt": union([_undefined(), string$1()]).readonly().optional().describe("ISO-8601 instant when known."),
			"format": union([
				literal("image"),
				literal("other"),
				literal("video"),
				literal("article")
			]).readonly(),
			"views": union([_undefined(), number$1()]).readonly().optional(),
			"likes": union([_undefined(), number$1()]).readonly().optional(),
			"comments": union([_undefined(), number$1()]).readonly().optional(),
			"collects": union([_undefined(), number$1()]).readonly().optional(),
			"shares": union([_undefined(), number$1()]).readonly().optional(),
			"coverUrl": union([_undefined(), string$1()]).readonly().optional().describe("Cover image URL as the platform served it; platform CDNs sign these URLs, so old ones may stop loading."),
			"extra": record(string$1(), number$1()).readonly().readonly(),
			"source": union([literal("scrape"), literal("import")]).readonly(),
			"updatedAt": string$1().readonly().describe("ISO-8601 instant of the last write.")
		}).readonly(),
		"label": string$1().readonly().describe("What it is ranked by, such as `7日新增播放`."),
		"value": number$1().readonly()
	})).readonly().describe("The three posts with the most views (or likes) among those published in the last 30 days."),
	"posts": array(object({
		"accountId": string$1().readonly(),
		"postId": string$1().readonly().describe("Platform post id, or a stable hash of the URL/title when the platform exposes none."),
		"title": string$1().readonly(),
		"url": union([_undefined(), string$1()]).readonly().optional(),
		"publishedAt": union([_undefined(), string$1()]).readonly().optional().describe("ISO-8601 instant when known."),
		"format": union([
			literal("image"),
			literal("other"),
			literal("video"),
			literal("article")
		]).readonly(),
		"views": union([_undefined(), number$1()]).readonly().optional(),
		"likes": union([_undefined(), number$1()]).readonly().optional(),
		"comments": union([_undefined(), number$1()]).readonly().optional(),
		"collects": union([_undefined(), number$1()]).readonly().optional(),
		"shares": union([_undefined(), number$1()]).readonly().optional(),
		"coverUrl": union([_undefined(), string$1()]).readonly().optional().describe("Cover image URL as the platform served it; platform CDNs sign these URLs, so old ones may stop loading."),
		"extra": record(string$1(), number$1()).readonly().readonly(),
		"source": union([literal("scrape"), literal("import")]).readonly(),
		"updatedAt": string$1().readonly().describe("ISO-8601 instant of the last write.")
	})).readonly().describe("Newest posts with their latest counters.")
});
let dsh_media_mediaSuite_deleteAccount_parameter_0$schema$value;
const dsh_media_mediaSuite_deleteAccount_parameter_0$schema = () => dsh_media_mediaSuite_deleteAccount_parameter_0$schema$value ??= string$1();
let dsh_media_mediaSuite_deleteAccount_result$schema$value;
const dsh_media_mediaSuite_deleteAccount_result$schema = () => dsh_media_mediaSuite_deleteAccount_result$schema$value ??= _void();
let dsh_media_mediaSuite_drafts_result$schema$value;
const dsh_media_mediaSuite_drafts_result$schema = () => dsh_media_mediaSuite_drafts_result$schema$value ??= array(object({
	"id": string$1().readonly(),
	"createdAt": string$1().readonly(),
	"publishedUrl": union([_undefined(), string$1()]).readonly().optional().describe("Address of the published post; its counters come from the fetched posts with the same address."),
	"publishedAt": union([_undefined(), string$1()]).readonly().optional(),
	"demo": union([_undefined(), literal(true)]).readonly().optional().describe("Set on drafts `loadDemo` creates."),
	"source": string$1().readonly().describe("Name of the tool that made it, shown beside the title, such as 宣传片工坊."),
	"kind": union([
		literal("video"),
		literal("article"),
		literal("card")
	]).readonly(),
	"title": string$1().readonly(),
	"file": union([_undefined(), string$1()]).readonly().optional().describe("Absolute path of the finished file, when there is one."),
	"folder": union([_undefined(), string$1()]).readonly().optional().describe("Absolute path of the folder that holds the work."),
	"note": union([_undefined(), string$1()]).readonly().optional().describe("One line about the content, such as its ratio and length."),
	"studioProject": union([_undefined(), string$1()]).readonly().optional().describe("Creation-workbench project id of an article or card set.")
}));
let dsh_media_mediaSuite_findRelated_parameter_0$schema$value;
const dsh_media_mediaSuite_findRelated_parameter_0$schema = () => dsh_media_mediaSuite_findRelated_parameter_0$schema$value ??= string$1();
let dsh_media_mediaSuite_findRelated_result$schema$value;
const dsh_media_mediaSuite_findRelated_result$schema = () => dsh_media_mediaSuite_findRelated_result$schema$value ??= object({
	"id": string$1().readonly(),
	"accountId": string$1().readonly(),
	"createdAt": string$1().readonly(),
	"model": string$1().readonly().describe("`provider/model` that generated the report."),
	"summary": string$1().readonly(),
	"suggestions": array(object({
		"title": string$1().readonly(),
		"angle": string$1().readonly().describe("Angle or hook that differentiates the topic."),
		"reason": string$1().readonly().describe("Why the topic suits this account, citing data."),
		"format": union([
			literal("image"),
			literal("other"),
			literal("video"),
			literal("article")
		]).readonly(),
		"headlines": array(string$1()).readonly().describe("Candidate post titles."),
		"references": array(string$1()).readonly().describe("Titles of own or benchmark posts that inspired the suggestion."),
		"priority": union([
			literal("high"),
			literal("medium"),
			literal("low")
		]).readonly(),
		"keywords": array(string$1()).readonly().describe("Short platform search keywords for the topic; empty in reports generated before keywords were requested."),
		"related": array(object({
			"postId": string$1().readonly(),
			"title": string$1().readonly(),
			"url": string$1().readonly(),
			"author": string$1().readonly().describe("Author nickname."),
			"coverUrl": union([_undefined(), string$1()]).readonly().optional().describe("Cover image URL as the platform served it; platform CDNs sign these URLs, so old ones may stop loading."),
			"publishedAt": union([_undefined(), string$1()]).readonly().optional().describe("ISO-8601 publish instant."),
			"format": union([
				literal("image"),
				literal("other"),
				literal("video"),
				literal("article")
			]).readonly(),
			"views": union([_undefined(), number$1()]).readonly().optional(),
			"likes": union([_undefined(), number$1()]).readonly().optional(),
			"comments": union([_undefined(), number$1()]).readonly().optional(),
			"collects": union([_undefined(), number$1()]).readonly().optional(),
			"shares": union([_undefined(), number$1()]).readonly().optional()
		})).readonly().describe("Popular platform posts found by searching the keywords, most liked first; empty when search was unavailable."),
		"video": union([_undefined(), object({
			"hook": string$1().readonly().describe("The first line spoken, written to hold the viewer through the first three seconds."),
			"outline": array(string$1()).readonly().describe("Talking points in order, one per segment of the script."),
			"seconds": number$1().readonly().describe("Suggested length in seconds; 0 when the model gave none."),
			"cover": string$1().readonly().describe("Text for the cover image.")
		})]).readonly().optional().describe("Filming plan of a video topic; absent for other formats and in reports generated before the plan was requested.")
	})).readonly(),
	"research": union([_undefined(), object({
		"searches": array(object({
			"keyword": string$1().readonly(),
			"posts": array(object({
				"postId": string$1().readonly(),
				"title": string$1().readonly(),
				"url": string$1().readonly(),
				"author": string$1().readonly().describe("Author nickname."),
				"coverUrl": union([_undefined(), string$1()]).readonly().optional().describe("Cover image URL as the platform served it; platform CDNs sign these URLs, so old ones may stop loading."),
				"publishedAt": union([_undefined(), string$1()]).readonly().optional().describe("ISO-8601 publish instant."),
				"format": union([
					literal("image"),
					literal("other"),
					literal("video"),
					literal("article")
				]).readonly(),
				"views": union([_undefined(), number$1()]).readonly().optional(),
				"likes": union([_undefined(), number$1()]).readonly().optional(),
				"comments": union([_undefined(), number$1()]).readonly().optional(),
				"collects": union([_undefined(), number$1()]).readonly().optional(),
				"shares": union([_undefined(), number$1()]).readonly().optional()
			})).readonly()
		})).readonly().describe("Platform searches for the account's own keywords."),
		"trending": array(object({
			"word": string$1().readonly(),
			"heat": union([_undefined(), number$1()]).readonly().optional().describe("Platform heat score, where reported.")
		})).readonly(),
		"news": array(object({
			"title": string$1().readonly(),
			"url": string$1().readonly(),
			"snippet": string$1().readonly(),
			"publishedAt": union([_undefined(), string$1()]).readonly().optional().describe("ISO-8601 or platform-formatted publish date, where reported.")
		})).readonly(),
		"benchmarksRefreshed": number$1().readonly().describe("Benchmark accounts whose data was refreshed for this report."),
		"notes": array(string$1()).readonly().describe("Sources that were skipped or failed, in Chinese.")
	})]).readonly().optional().describe("Material gathered before generation; absent in reports generated before research existed."),
	"direction": union([_undefined(), string$1()]).readonly().optional().describe("What the user asked this report to be about; absent when no direction was given.")
});
let dsh_media_mediaSuite_generateTopics_parameter_0$schema$value;
const dsh_media_mediaSuite_generateTopics_parameter_0$schema = () => dsh_media_mediaSuite_generateTopics_parameter_0$schema$value ??= string$1();
let dsh_media_mediaSuite_generateTopics_result$schema$value;
const dsh_media_mediaSuite_generateTopics_result$schema = () => dsh_media_mediaSuite_generateTopics_result$schema$value ??= object({
	"id": string$1().readonly(),
	"accountId": string$1().readonly(),
	"createdAt": string$1().readonly(),
	"model": string$1().readonly().describe("`provider/model` that generated the report."),
	"summary": string$1().readonly(),
	"suggestions": array(object({
		"title": string$1().readonly(),
		"angle": string$1().readonly().describe("Angle or hook that differentiates the topic."),
		"reason": string$1().readonly().describe("Why the topic suits this account, citing data."),
		"format": union([
			literal("image"),
			literal("other"),
			literal("video"),
			literal("article")
		]).readonly(),
		"headlines": array(string$1()).readonly().describe("Candidate post titles."),
		"references": array(string$1()).readonly().describe("Titles of own or benchmark posts that inspired the suggestion."),
		"priority": union([
			literal("high"),
			literal("medium"),
			literal("low")
		]).readonly(),
		"keywords": array(string$1()).readonly().describe("Short platform search keywords for the topic; empty in reports generated before keywords were requested."),
		"related": array(object({
			"postId": string$1().readonly(),
			"title": string$1().readonly(),
			"url": string$1().readonly(),
			"author": string$1().readonly().describe("Author nickname."),
			"coverUrl": union([_undefined(), string$1()]).readonly().optional().describe("Cover image URL as the platform served it; platform CDNs sign these URLs, so old ones may stop loading."),
			"publishedAt": union([_undefined(), string$1()]).readonly().optional().describe("ISO-8601 publish instant."),
			"format": union([
				literal("image"),
				literal("other"),
				literal("video"),
				literal("article")
			]).readonly(),
			"views": union([_undefined(), number$1()]).readonly().optional(),
			"likes": union([_undefined(), number$1()]).readonly().optional(),
			"comments": union([_undefined(), number$1()]).readonly().optional(),
			"collects": union([_undefined(), number$1()]).readonly().optional(),
			"shares": union([_undefined(), number$1()]).readonly().optional()
		})).readonly().describe("Popular platform posts found by searching the keywords, most liked first; empty when search was unavailable."),
		"video": union([_undefined(), object({
			"hook": string$1().readonly().describe("The first line spoken, written to hold the viewer through the first three seconds."),
			"outline": array(string$1()).readonly().describe("Talking points in order, one per segment of the script."),
			"seconds": number$1().readonly().describe("Suggested length in seconds; 0 when the model gave none."),
			"cover": string$1().readonly().describe("Text for the cover image.")
		})]).readonly().optional().describe("Filming plan of a video topic; absent for other formats and in reports generated before the plan was requested.")
	})).readonly(),
	"research": union([_undefined(), object({
		"searches": array(object({
			"keyword": string$1().readonly(),
			"posts": array(object({
				"postId": string$1().readonly(),
				"title": string$1().readonly(),
				"url": string$1().readonly(),
				"author": string$1().readonly().describe("Author nickname."),
				"coverUrl": union([_undefined(), string$1()]).readonly().optional().describe("Cover image URL as the platform served it; platform CDNs sign these URLs, so old ones may stop loading."),
				"publishedAt": union([_undefined(), string$1()]).readonly().optional().describe("ISO-8601 publish instant."),
				"format": union([
					literal("image"),
					literal("other"),
					literal("video"),
					literal("article")
				]).readonly(),
				"views": union([_undefined(), number$1()]).readonly().optional(),
				"likes": union([_undefined(), number$1()]).readonly().optional(),
				"comments": union([_undefined(), number$1()]).readonly().optional(),
				"collects": union([_undefined(), number$1()]).readonly().optional(),
				"shares": union([_undefined(), number$1()]).readonly().optional()
			})).readonly()
		})).readonly().describe("Platform searches for the account's own keywords."),
		"trending": array(object({
			"word": string$1().readonly(),
			"heat": union([_undefined(), number$1()]).readonly().optional().describe("Platform heat score, where reported.")
		})).readonly(),
		"news": array(object({
			"title": string$1().readonly(),
			"url": string$1().readonly(),
			"snippet": string$1().readonly(),
			"publishedAt": union([_undefined(), string$1()]).readonly().optional().describe("ISO-8601 or platform-formatted publish date, where reported.")
		})).readonly(),
		"benchmarksRefreshed": number$1().readonly().describe("Benchmark accounts whose data was refreshed for this report."),
		"notes": array(string$1()).readonly().describe("Sources that were skipped or failed, in Chinese.")
	})]).readonly().optional().describe("Material gathered before generation; absent in reports generated before research existed."),
	"direction": union([_undefined(), string$1()]).readonly().optional().describe("What the user asked this report to be about; absent when no direction was given.")
});
let dsh_media_mediaSuite_generateTopicsAbout_parameter_0$schema$value;
const dsh_media_mediaSuite_generateTopicsAbout_parameter_0$schema = () => dsh_media_mediaSuite_generateTopicsAbout_parameter_0$schema$value ??= string$1();
let dsh_media_mediaSuite_generateTopicsAbout_parameter_1$schema$value;
const dsh_media_mediaSuite_generateTopicsAbout_parameter_1$schema = () => dsh_media_mediaSuite_generateTopicsAbout_parameter_1$schema$value ??= string$1();
let dsh_media_mediaSuite_generateTopicsAbout_result$schema$value;
const dsh_media_mediaSuite_generateTopicsAbout_result$schema = () => dsh_media_mediaSuite_generateTopicsAbout_result$schema$value ??= object({
	"id": string$1().readonly(),
	"accountId": string$1().readonly(),
	"createdAt": string$1().readonly(),
	"model": string$1().readonly().describe("`provider/model` that generated the report."),
	"summary": string$1().readonly(),
	"suggestions": array(object({
		"title": string$1().readonly(),
		"angle": string$1().readonly().describe("Angle or hook that differentiates the topic."),
		"reason": string$1().readonly().describe("Why the topic suits this account, citing data."),
		"format": union([
			literal("image"),
			literal("other"),
			literal("video"),
			literal("article")
		]).readonly(),
		"headlines": array(string$1()).readonly().describe("Candidate post titles."),
		"references": array(string$1()).readonly().describe("Titles of own or benchmark posts that inspired the suggestion."),
		"priority": union([
			literal("high"),
			literal("medium"),
			literal("low")
		]).readonly(),
		"keywords": array(string$1()).readonly().describe("Short platform search keywords for the topic; empty in reports generated before keywords were requested."),
		"related": array(object({
			"postId": string$1().readonly(),
			"title": string$1().readonly(),
			"url": string$1().readonly(),
			"author": string$1().readonly().describe("Author nickname."),
			"coverUrl": union([_undefined(), string$1()]).readonly().optional().describe("Cover image URL as the platform served it; platform CDNs sign these URLs, so old ones may stop loading."),
			"publishedAt": union([_undefined(), string$1()]).readonly().optional().describe("ISO-8601 publish instant."),
			"format": union([
				literal("image"),
				literal("other"),
				literal("video"),
				literal("article")
			]).readonly(),
			"views": union([_undefined(), number$1()]).readonly().optional(),
			"likes": union([_undefined(), number$1()]).readonly().optional(),
			"comments": union([_undefined(), number$1()]).readonly().optional(),
			"collects": union([_undefined(), number$1()]).readonly().optional(),
			"shares": union([_undefined(), number$1()]).readonly().optional()
		})).readonly().describe("Popular platform posts found by searching the keywords, most liked first; empty when search was unavailable."),
		"video": union([_undefined(), object({
			"hook": string$1().readonly().describe("The first line spoken, written to hold the viewer through the first three seconds."),
			"outline": array(string$1()).readonly().describe("Talking points in order, one per segment of the script."),
			"seconds": number$1().readonly().describe("Suggested length in seconds; 0 when the model gave none."),
			"cover": string$1().readonly().describe("Text for the cover image.")
		})]).readonly().optional().describe("Filming plan of a video topic; absent for other formats and in reports generated before the plan was requested.")
	})).readonly(),
	"research": union([_undefined(), object({
		"searches": array(object({
			"keyword": string$1().readonly(),
			"posts": array(object({
				"postId": string$1().readonly(),
				"title": string$1().readonly(),
				"url": string$1().readonly(),
				"author": string$1().readonly().describe("Author nickname."),
				"coverUrl": union([_undefined(), string$1()]).readonly().optional().describe("Cover image URL as the platform served it; platform CDNs sign these URLs, so old ones may stop loading."),
				"publishedAt": union([_undefined(), string$1()]).readonly().optional().describe("ISO-8601 publish instant."),
				"format": union([
					literal("image"),
					literal("other"),
					literal("video"),
					literal("article")
				]).readonly(),
				"views": union([_undefined(), number$1()]).readonly().optional(),
				"likes": union([_undefined(), number$1()]).readonly().optional(),
				"comments": union([_undefined(), number$1()]).readonly().optional(),
				"collects": union([_undefined(), number$1()]).readonly().optional(),
				"shares": union([_undefined(), number$1()]).readonly().optional()
			})).readonly()
		})).readonly().describe("Platform searches for the account's own keywords."),
		"trending": array(object({
			"word": string$1().readonly(),
			"heat": union([_undefined(), number$1()]).readonly().optional().describe("Platform heat score, where reported.")
		})).readonly(),
		"news": array(object({
			"title": string$1().readonly(),
			"url": string$1().readonly(),
			"snippet": string$1().readonly(),
			"publishedAt": union([_undefined(), string$1()]).readonly().optional().describe("ISO-8601 or platform-formatted publish date, where reported.")
		})).readonly(),
		"benchmarksRefreshed": number$1().readonly().describe("Benchmark accounts whose data was refreshed for this report."),
		"notes": array(string$1()).readonly().describe("Sources that were skipped or failed, in Chinese.")
	})]).readonly().optional().describe("Material gathered before generation; absent in reports generated before research existed."),
	"direction": union([_undefined(), string$1()]).readonly().optional().describe("What the user asked this report to be about; absent when no direction was given.")
});
let dsh_media_mediaSuite_identify_parameter_0$schema$value;
const dsh_media_mediaSuite_identify_parameter_0$schema = () => dsh_media_mediaSuite_identify_parameter_0$schema$value ??= string$1();
let dsh_media_mediaSuite_identify_result$schema$value;
const dsh_media_mediaSuite_identify_result$schema = () => dsh_media_mediaSuite_identify_result$schema$value ??= object({
	"platform": string$1().readonly(),
	"name": string$1().readonly().describe("Platform nickname."),
	"profileUrl": string$1().readonly().describe("Canonical profile URL usable as MediaAccountDraft.profileUrl."),
	"avatarUrl": union([_undefined(), string$1()]).readonly().optional().describe("Avatar image URL, when the platform showed one."),
	"existingAccountId": union([_undefined(), string$1()]).readonly().optional().describe("Existing own account with the same platform and profile URL, if any.")
});
let dsh_media_mediaSuite_importFile_parameter_0$schema$value;
const dsh_media_mediaSuite_importFile_parameter_0$schema = () => dsh_media_mediaSuite_importFile_parameter_0$schema$value ??= string$1();
let dsh_media_mediaSuite_importFile_parameter_1$schema$value;
const dsh_media_mediaSuite_importFile_parameter_1$schema = () => dsh_media_mediaSuite_importFile_parameter_1$schema$value ??= string$1();
let dsh_media_mediaSuite_importFile_parameter_2$schema$value;
const dsh_media_mediaSuite_importFile_parameter_2$schema = () => dsh_media_mediaSuite_importFile_parameter_2$schema$value ??= string$1();
let dsh_media_mediaSuite_importFile_result$schema$value;
const dsh_media_mediaSuite_importFile_result$schema = () => dsh_media_mediaSuite_importFile_result$schema$value ??= object({
	"snapshotWritten": boolean$1().readonly(),
	"postsWritten": number$1().readonly(),
	"unmappedColumns": array(string$1()).readonly().describe("Header names that matched no known column.")
});
let dsh_media_mediaSuite_loadDemo_result$schema$value;
const dsh_media_mediaSuite_loadDemo_result$schema = () => dsh_media_mediaSuite_loadDemo_result$schema$value ??= object({
	"id": string$1().readonly(),
	"demo": union([_undefined(), literal(true)]).readonly().optional().describe("Set on the sample accounts `loadDemo` creates; they hold made-up data and are never fetched."),
	"loginProfile": union([_undefined(), string$1()]).readonly().optional().describe("Browser profile that keeps this own account's login, set when the account is connected by scanning. Without it the account uses the platform's shared profile, which holds one login at a time."),
	"createdAt": string$1().readonly().describe("ISO-8601 instants."),
	"updatedAt": string$1().readonly(),
	"platform": string$1().readonly(),
	"role": union([literal("own"), literal("benchmark")]).readonly(),
	"name": string$1().readonly().describe("Display name chosen by the user."),
	"profileUrl": string$1().readonly().describe("Public profile URL used by scraping."),
	"niche": string$1().readonly().describe("Content field, such as `职场成长` or `美食探店`, used by AI prompts."),
	"notes": string$1().readonly().describe("Free-form notes for AI prompts: audience, style, goals."),
	"monitor": object({
		"enabled": boolean$1().readonly(),
		"intervalMinutes": number$1().readonly().describe("Minutes between automatic scrapes; the Host clamps to its configured minimum.")
	}).readonly(),
	"avatarUrl": union([_undefined(), string$1()]).readonly().optional().describe("The account's avatar image on the platform (an https URL), read when scanning in and refreshed by each update.")
});
let dsh_media_mediaSuite_loginState_parameter_0$schema$value;
const dsh_media_mediaSuite_loginState_parameter_0$schema = () => dsh_media_mediaSuite_loginState_parameter_0$schema$value ??= string$1();
let dsh_media_mediaSuite_loginState_parameter_1$schema$value;
const dsh_media_mediaSuite_loginState_parameter_1$schema = () => dsh_media_mediaSuite_loginState_parameter_1$schema$value ??= union([_undefined(), string$1()]);
let dsh_media_mediaSuite_loginState_result$schema$value;
const dsh_media_mediaSuite_loginState_result$schema = () => dsh_media_mediaSuite_loginState_result$schema$value ??= union([
	literal("unknown"),
	literal("logged-in"),
	literal("logged-out")
]);
let dsh_media_mediaSuite_markDraftPublished_parameter_0$schema$value;
const dsh_media_mediaSuite_markDraftPublished_parameter_0$schema = () => dsh_media_mediaSuite_markDraftPublished_parameter_0$schema$value ??= string$1();
let dsh_media_mediaSuite_markDraftPublished_parameter_1$schema$value;
const dsh_media_mediaSuite_markDraftPublished_parameter_1$schema = () => dsh_media_mediaSuite_markDraftPublished_parameter_1$schema$value ??= string$1();
let dsh_media_mediaSuite_markDraftPublished_result$schema$value;
const dsh_media_mediaSuite_markDraftPublished_result$schema = () => dsh_media_mediaSuite_markDraftPublished_result$schema$value ??= object({
	"id": string$1().readonly(),
	"createdAt": string$1().readonly(),
	"publishedUrl": union([_undefined(), string$1()]).readonly().optional().describe("Address of the published post; its counters come from the fetched posts with the same address."),
	"publishedAt": union([_undefined(), string$1()]).readonly().optional(),
	"demo": union([_undefined(), literal(true)]).readonly().optional().describe("Set on drafts `loadDemo` creates."),
	"source": string$1().readonly().describe("Name of the tool that made it, shown beside the title, such as 宣传片工坊."),
	"kind": union([
		literal("video"),
		literal("article"),
		literal("card")
	]).readonly(),
	"title": string$1().readonly(),
	"file": union([_undefined(), string$1()]).readonly().optional().describe("Absolute path of the finished file, when there is one."),
	"folder": union([_undefined(), string$1()]).readonly().optional().describe("Absolute path of the folder that holds the work."),
	"note": union([_undefined(), string$1()]).readonly().optional().describe("One line about the content, such as its ratio and length."),
	"studioProject": union([_undefined(), string$1()]).readonly().optional().describe("Creation-workbench project id of an article or card set.")
});
let dsh_media_mediaSuite_network_parameter_0$schema$value;
const dsh_media_mediaSuite_network_parameter_0$schema = () => dsh_media_mediaSuite_network_parameter_0$schema$value ??= number$1();
let dsh_media_mediaSuite_network_result$schema$value;
const dsh_media_mediaSuite_network_result$schema = () => dsh_media_mediaSuite_network_result$schema$value ??= object({
	"days": number$1().readonly(),
	"accounts": array(object({
		"account": object({
			"id": string$1().readonly(),
			"demo": union([_undefined(), literal(true)]).readonly().optional().describe("Set on the sample accounts `loadDemo` creates; they hold made-up data and are never fetched."),
			"loginProfile": union([_undefined(), string$1()]).readonly().optional().describe("Browser profile that keeps this own account's login, set when the account is connected by scanning. Without it the account uses the platform's shared profile, which holds one login at a time."),
			"createdAt": string$1().readonly().describe("ISO-8601 instants."),
			"updatedAt": string$1().readonly(),
			"platform": string$1().readonly(),
			"role": union([literal("own"), literal("benchmark")]).readonly(),
			"name": string$1().readonly().describe("Display name chosen by the user."),
			"profileUrl": string$1().readonly().describe("Public profile URL used by scraping."),
			"niche": string$1().readonly().describe("Content field, such as `职场成长` or `美食探店`, used by AI prompts."),
			"notes": string$1().readonly().describe("Free-form notes for AI prompts: audience, style, goals."),
			"monitor": object({
				"enabled": boolean$1().readonly(),
				"intervalMinutes": number$1().readonly().describe("Minutes between automatic scrapes; the Host clamps to its configured minimum.")
			}).readonly(),
			"avatarUrl": union([_undefined(), string$1()]).readonly().optional().describe("The account's avatar image on the platform (an https URL), read when scanning in and refreshed by each update.")
		}).readonly(),
		"platform": object({
			"search": boolean$1().readonly().optional().describe("Whether the platform can search posts, filled in by the registry from the adapter; adapters omit it."),
			"id": string$1().readonly(),
			"displayName": string$1().readonly().describe("Display name in the platform's own language, such as `小红书`."),
			"loginUrl": string$1().readonly().describe("Home page the embedded browser opens for login."),
			"scrape": boolean$1().readonly().describe("Whether the adapter scrapes through the embedded browser."),
			"import": boolean$1().readonly().describe("Whether the adapter maps creator-backend export files."),
			"importHint": string$1().readonly().describe("Short hint describing which export file the user should upload."),
			"profileUrlExample": string$1().readonly().describe("Example profile URL shown as the input placeholder."),
			"metrics": union([_undefined(), object({
				"views": union([_undefined(), string$1()]).readonly().optional(),
				"likes": union([_undefined(), string$1()]).readonly().optional(),
				"comments": union([_undefined(), string$1()]).readonly().optional(),
				"shares": union([_undefined(), string$1()]).readonly().optional(),
				"collects": union([_undefined(), string$1()]).readonly().optional()
			})]).readonly().optional().describe("The platform's own names for the post counters, such as `阅读` for a 公众号's `views`. Counters the platform does not report are left out, so the page and the tools never show a counter that is always empty."),
			"noun": union([_undefined(), string$1()]).readonly().optional().describe("What one post is called on the platform, such as `视频`, `笔记` or `文章`."),
			"color": union([_undefined(), string$1()]).readonly().optional().describe("Brand color (CSS), for the platform's tints and its series in charts; a platform added later brings its own."),
			"beta": union([
				_undefined(),
				literal(false),
				literal(true)
			]).readonly().optional().describe("Set while the adapter has not been checked against a real logged-in account; the page marks the platform as a trial.")
		}).readonly(),
		"health": object({
			"state": union([
				literal("pending"),
				literal("stale"),
				literal("login-required"),
				literal("failing"),
				literal("ok")
			]).readonly(),
			"updatedAt": union([_undefined(), string$1()]).readonly().optional().describe("ISO-8601 instant of the newest stored counters, when any."),
			"errorCode": union([_undefined(), string$1()]).readonly().optional().describe("Failure code of the last run, when it failed."),
			"message": union([_undefined(), string$1()]).readonly().optional().describe("Failure message of the last run, when it failed, in Chinese."),
			"nextRunAt": union([_undefined(), string$1()]).readonly().optional().describe("ISO-8601 instant of the next automatic update, when monitoring is on."),
			"monitored": boolean$1().readonly().describe("Whether automatic updates are on.")
		}).readonly(),
		"followers": union([_undefined(), number$1()]).readonly().optional().describe("Newest known follower total."),
		"kpis": array(object({
			"key": string$1().readonly().describe("Stable key: `views`, `likes`, `comments`, `shares`, `collects`, `posts`, `engagement`, `profileViews`, `followers`, `fansNet`, …"),
			"label": string$1().readonly().describe("Display name in the platform's words, such as `阅读量`."),
			"unit": union([
				literal("count"),
				literal("percent"),
				literal("seconds")
			]).readonly(),
			"value": union([_undefined(), number$1()]).readonly().optional().describe("Total over the window, or the newest value for a running total such as followers; undefined when unknown."),
			"change": union([_undefined(), number$1()]).readonly().optional().describe("Relative change against the window of the same length before it, such as 0.12 for +12%; undefined when unknown."),
			"previous": union([_undefined(), number$1()]).readonly().optional().describe("Value over the window of the same length before it; undefined when unknown."),
			"daily": array(object({
				"day": string$1().readonly().describe("`YYYY-MM-DD`, China time."),
				"value": number$1().readonly()
			})).readonly().describe("Daily values inside the window, oldest first; days without data are left out."),
			"hint": string$1().readonly().describe("How the number is counted, in Chinese.")
		})).readonly().describe("The window's works and fans counters, as on the account's own dashboard."),
		"from": string$1().readonly(),
		"to": string$1().readonly()
	})).readonly(),
	"totals": array(object({
		"key": union([
			literal("followers"),
			literal("fansNet"),
			literal("views"),
			literal("likes"),
			literal("comments"),
			literal("shares"),
			literal("posts")
		]).readonly(),
		"label": string$1().readonly(),
		"unit": union([
			literal("count"),
			literal("percent"),
			literal("seconds")
		]).readonly(),
		"value": union([_undefined(), number$1()]).readonly().optional(),
		"previous": union([_undefined(), number$1()]).readonly().optional().describe("Sum of the previous windows; only when every contributing account has one, so the change compares like with like."),
		"change": union([_undefined(), number$1()]).readonly().optional(),
		"parts": array(object({
			"accountId": string$1().readonly(),
			"value": number$1().readonly()
		})).readonly(),
		"daily": array(object({
			"day": string$1().readonly(),
			"total": number$1().readonly(),
			"parts": record(string$1(), number$1()).readonly().readonly()
		})).readonly().describe("Daily sums with each account's part over the window, on the days every contributing account reported, oldest first."),
		"trend": array(object({
			"day": string$1().readonly(),
			"total": number$1().readonly(),
			"parts": record(string$1(), number$1()).readonly().readonly()
		})).readonly().describe("The last 90 days for the trend chart, oldest first. A count adds the accounts that reported each day (`parts` lists them, so a day an account did not report shows as missing, not as zero); a level such as the follower total keeps only the days every account reported.")
	})).readonly(),
	"synced": array(object({
		"title": string$1().readonly(),
		"posts": array(object({
			"accountId": string$1().readonly(),
			"postId": string$1().readonly().describe("Platform post id, or a stable hash of the URL/title when the platform exposes none."),
			"title": string$1().readonly(),
			"url": union([_undefined(), string$1()]).readonly().optional(),
			"publishedAt": union([_undefined(), string$1()]).readonly().optional().describe("ISO-8601 instant when known."),
			"format": union([
				literal("image"),
				literal("other"),
				literal("video"),
				literal("article")
			]).readonly(),
			"views": union([_undefined(), number$1()]).readonly().optional(),
			"likes": union([_undefined(), number$1()]).readonly().optional(),
			"comments": union([_undefined(), number$1()]).readonly().optional(),
			"collects": union([_undefined(), number$1()]).readonly().optional(),
			"shares": union([_undefined(), number$1()]).readonly().optional(),
			"coverUrl": union([_undefined(), string$1()]).readonly().optional().describe("Cover image URL as the platform served it; platform CDNs sign these URLs, so old ones may stop loading."),
			"extra": record(string$1(), number$1()).readonly().readonly(),
			"source": union([literal("scrape"), literal("import")]).readonly(),
			"updatedAt": string$1().readonly().describe("ISO-8601 instant of the last write.")
		})).readonly(),
		"views": union([_undefined(), number$1()]).readonly().optional(),
		"likes": union([_undefined(), number$1()]).readonly().optional(),
		"comments": union([_undefined(), number$1()]).readonly().optional(),
		"shares": union([_undefined(), number$1()]).readonly().optional()
	})).readonly(),
	"posts": array(object({
		"accountId": string$1().readonly(),
		"postId": string$1().readonly().describe("Platform post id, or a stable hash of the URL/title when the platform exposes none."),
		"title": string$1().readonly(),
		"url": union([_undefined(), string$1()]).readonly().optional(),
		"publishedAt": union([_undefined(), string$1()]).readonly().optional().describe("ISO-8601 instant when known."),
		"format": union([
			literal("image"),
			literal("other"),
			literal("video"),
			literal("article")
		]).readonly(),
		"views": union([_undefined(), number$1()]).readonly().optional(),
		"likes": union([_undefined(), number$1()]).readonly().optional(),
		"comments": union([_undefined(), number$1()]).readonly().optional(),
		"collects": union([_undefined(), number$1()]).readonly().optional(),
		"shares": union([_undefined(), number$1()]).readonly().optional(),
		"coverUrl": union([_undefined(), string$1()]).readonly().optional().describe("Cover image URL as the platform served it; platform CDNs sign these URLs, so old ones may stop loading."),
		"extra": record(string$1(), number$1()).readonly().readonly(),
		"source": union([literal("scrape"), literal("import")]).readonly(),
		"updatedAt": string$1().readonly().describe("ISO-8601 instant of the last write.")
	})).readonly().describe("Newest posts of every own account, newest first.")
});
let dsh_media_mediaSuite_overview_parameter_0$schema$value;
const dsh_media_mediaSuite_overview_parameter_0$schema = () => dsh_media_mediaSuite_overview_parameter_0$schema$value ??= string$1();
let dsh_media_mediaSuite_overview_parameter_1$schema$value;
const dsh_media_mediaSuite_overview_parameter_1$schema = () => dsh_media_mediaSuite_overview_parameter_1$schema$value ??= number$1();
let dsh_media_mediaSuite_overview_result$schema$value;
const dsh_media_mediaSuite_overview_result$schema = () => dsh_media_mediaSuite_overview_result$schema$value ??= object({
	"account": object({
		"id": string$1().readonly(),
		"demo": union([_undefined(), literal(true)]).readonly().optional().describe("Set on the sample accounts `loadDemo` creates; they hold made-up data and are never fetched."),
		"loginProfile": union([_undefined(), string$1()]).readonly().optional().describe("Browser profile that keeps this own account's login, set when the account is connected by scanning. Without it the account uses the platform's shared profile, which holds one login at a time."),
		"createdAt": string$1().readonly().describe("ISO-8601 instants."),
		"updatedAt": string$1().readonly(),
		"platform": string$1().readonly(),
		"role": union([literal("own"), literal("benchmark")]).readonly(),
		"name": string$1().readonly().describe("Display name chosen by the user."),
		"profileUrl": string$1().readonly().describe("Public profile URL used by scraping."),
		"niche": string$1().readonly().describe("Content field, such as `职场成长` or `美食探店`, used by AI prompts."),
		"notes": string$1().readonly().describe("Free-form notes for AI prompts: audience, style, goals."),
		"monitor": object({
			"enabled": boolean$1().readonly(),
			"intervalMinutes": number$1().readonly().describe("Minutes between automatic scrapes; the Host clamps to its configured minimum.")
		}).readonly(),
		"avatarUrl": union([_undefined(), string$1()]).readonly().optional().describe("The account's avatar image on the platform (an https URL), read when scanning in and refreshed by each update.")
	}).readonly(),
	"latest": union([_undefined(), object({
		"accountId": string$1().readonly(),
		"capturedAt": string$1().readonly().describe("ISO-8601 capture instant."),
		"source": union([literal("scrape"), literal("import")]).readonly(),
		"followers": union([_undefined(), number$1()]).readonly().optional(),
		"following": union([_undefined(), number$1()]).readonly().optional(),
		"likes": union([_undefined(), number$1()]).readonly().optional().describe("Total likes received; 小红书 reports likes and collects together here."),
		"posts": union([_undefined(), number$1()]).readonly().optional(),
		"extra": record(string$1(), number$1()).readonly().readonly().describe("Platform-specific numeric counters, keyed by adapter-defined names.")
	})]).readonly().optional(),
	"series": array(object({
		"at": string$1().readonly().describe("ISO-8601 capture instant."),
		"followers": union([_undefined(), number$1()]).readonly().optional(),
		"likes": union([_undefined(), number$1()]).readonly().optional(),
		"posts": union([_undefined(), number$1()]).readonly().optional(),
		"plays": union([_undefined(), number$1()]).readonly().optional().describe("Daily plays, from snapshot `extra.plays` where the platform reports them."),
		"profileViews": union([_undefined(), number$1()]).readonly().optional().describe("Daily profile visits, from snapshot `extra.profileViews` where the platform reports them."),
		"fansNet": union([_undefined(), number$1()]).readonly().optional().describe("Daily net follower change, from snapshot `extra.fansNet` where the platform reports it."),
		"postLikes": union([_undefined(), number$1()]).readonly().optional().describe("Daily likes received on posts, from snapshot `extra.postLikes` where the platform reports them.")
	})).readonly().describe("Snapshots inside the requested window, oldest first."),
	"deltas": object({
		"followers": union([_undefined(), number$1()]).readonly().optional(),
		"likes": union([_undefined(), number$1()]).readonly().optional(),
		"posts": union([_undefined(), number$1()]).readonly().optional()
	}).readonly().describe("Change of each counter between the first and the latest snapshot in the window."),
	"engagement": object({
		"postCount": number$1().readonly(),
		"avgLikes": union([_undefined(), number$1()]).readonly().optional(),
		"avgComments": union([_undefined(), number$1()]).readonly().optional(),
		"avgCollects": union([_undefined(), number$1()]).readonly().optional(),
		"avgViews": union([_undefined(), number$1()]).readonly().optional()
	}).readonly().describe("Engagement averages over posts published inside the window."),
	"lastRun": union([_undefined(), object({
		"accountId": string$1().readonly(),
		"kind": union([literal("scrape"), literal("import")]).readonly(),
		"startedAt": string$1().readonly().describe("ISO-8601 instants."),
		"finishedAt": string$1().readonly(),
		"ok": boolean$1().readonly(),
		"errorCode": union([_undefined(), string$1()]).readonly().optional().describe("Localizable failure code, such as `login-required` or `parse-failed`."),
		"message": union([_undefined(), string$1()]).readonly().optional(),
		"postsWritten": number$1().readonly()
	})]).readonly().optional(),
	"login": union([
		literal("unknown"),
		literal("logged-in"),
		literal("logged-out")
	]).readonly(),
	"nextRunAt": union([_undefined(), string$1()]).readonly().optional().describe("ISO-8601 instant of the next automatic scrape, when monitoring is enabled.")
});
let dsh_media_mediaSuite_platforms_result$schema$value;
const dsh_media_mediaSuite_platforms_result$schema = () => dsh_media_mediaSuite_platforms_result$schema$value ??= array(object({
	"search": boolean$1().readonly().optional().describe("Whether the platform can search posts, filled in by the registry from the adapter; adapters omit it."),
	"id": string$1().readonly(),
	"displayName": string$1().readonly().describe("Display name in the platform's own language, such as `小红书`."),
	"loginUrl": string$1().readonly().describe("Home page the embedded browser opens for login."),
	"scrape": boolean$1().readonly().describe("Whether the adapter scrapes through the embedded browser."),
	"import": boolean$1().readonly().describe("Whether the adapter maps creator-backend export files."),
	"importHint": string$1().readonly().describe("Short hint describing which export file the user should upload."),
	"profileUrlExample": string$1().readonly().describe("Example profile URL shown as the input placeholder."),
	"metrics": union([_undefined(), object({
		"views": union([_undefined(), string$1()]).readonly().optional(),
		"likes": union([_undefined(), string$1()]).readonly().optional(),
		"comments": union([_undefined(), string$1()]).readonly().optional(),
		"shares": union([_undefined(), string$1()]).readonly().optional(),
		"collects": union([_undefined(), string$1()]).readonly().optional()
	})]).readonly().optional().describe("The platform's own names for the post counters, such as `阅读` for a 公众号's `views`. Counters the platform does not report are left out, so the page and the tools never show a counter that is always empty."),
	"noun": union([_undefined(), string$1()]).readonly().optional().describe("What one post is called on the platform, such as `视频`, `笔记` or `文章`."),
	"color": union([_undefined(), string$1()]).readonly().optional().describe("Brand color (CSS), for the platform's tints and its series in charts; a platform added later brings its own."),
	"beta": union([
		_undefined(),
		literal(false),
		literal(true)
	]).readonly().optional().describe("Set while the adapter has not been checked against a real logged-in account; the page marks the platform as a trial.")
}));
let dsh_media_mediaSuite_postDetail_parameter_0$schema$value;
const dsh_media_mediaSuite_postDetail_parameter_0$schema = () => dsh_media_mediaSuite_postDetail_parameter_0$schema$value ??= string$1();
let dsh_media_mediaSuite_postDetail_parameter_1$schema$value;
const dsh_media_mediaSuite_postDetail_parameter_1$schema = () => dsh_media_mediaSuite_postDetail_parameter_1$schema$value ??= string$1();
let dsh_media_mediaSuite_postDetail_result$schema$value;
const dsh_media_mediaSuite_postDetail_result$schema = () => dsh_media_mediaSuite_postDetail_result$schema$value ??= object({
	"account": object({
		"id": string$1().readonly(),
		"demo": union([_undefined(), literal(true)]).readonly().optional().describe("Set on the sample accounts `loadDemo` creates; they hold made-up data and are never fetched."),
		"loginProfile": union([_undefined(), string$1()]).readonly().optional().describe("Browser profile that keeps this own account's login, set when the account is connected by scanning. Without it the account uses the platform's shared profile, which holds one login at a time."),
		"createdAt": string$1().readonly().describe("ISO-8601 instants."),
		"updatedAt": string$1().readonly(),
		"platform": string$1().readonly(),
		"role": union([literal("own"), literal("benchmark")]).readonly(),
		"name": string$1().readonly().describe("Display name chosen by the user."),
		"profileUrl": string$1().readonly().describe("Public profile URL used by scraping."),
		"niche": string$1().readonly().describe("Content field, such as `职场成长` or `美食探店`, used by AI prompts."),
		"notes": string$1().readonly().describe("Free-form notes for AI prompts: audience, style, goals."),
		"monitor": object({
			"enabled": boolean$1().readonly(),
			"intervalMinutes": number$1().readonly().describe("Minutes between automatic scrapes; the Host clamps to its configured minimum.")
		}).readonly(),
		"avatarUrl": union([_undefined(), string$1()]).readonly().optional().describe("The account's avatar image on the platform (an https URL), read when scanning in and refreshed by each update.")
	}).readonly(),
	"platform": object({
		"search": boolean$1().readonly().optional().describe("Whether the platform can search posts, filled in by the registry from the adapter; adapters omit it."),
		"id": string$1().readonly(),
		"displayName": string$1().readonly().describe("Display name in the platform's own language, such as `小红书`."),
		"loginUrl": string$1().readonly().describe("Home page the embedded browser opens for login."),
		"scrape": boolean$1().readonly().describe("Whether the adapter scrapes through the embedded browser."),
		"import": boolean$1().readonly().describe("Whether the adapter maps creator-backend export files."),
		"importHint": string$1().readonly().describe("Short hint describing which export file the user should upload."),
		"profileUrlExample": string$1().readonly().describe("Example profile URL shown as the input placeholder."),
		"metrics": union([_undefined(), object({
			"views": union([_undefined(), string$1()]).readonly().optional(),
			"likes": union([_undefined(), string$1()]).readonly().optional(),
			"comments": union([_undefined(), string$1()]).readonly().optional(),
			"shares": union([_undefined(), string$1()]).readonly().optional(),
			"collects": union([_undefined(), string$1()]).readonly().optional()
		})]).readonly().optional().describe("The platform's own names for the post counters, such as `阅读` for a 公众号's `views`. Counters the platform does not report are left out, so the page and the tools never show a counter that is always empty."),
		"noun": union([_undefined(), string$1()]).readonly().optional().describe("What one post is called on the platform, such as `视频`, `笔记` or `文章`."),
		"color": union([_undefined(), string$1()]).readonly().optional().describe("Brand color (CSS), for the platform's tints and its series in charts; a platform added later brings its own."),
		"beta": union([
			_undefined(),
			literal(false),
			literal(true)
		]).readonly().optional().describe("Set while the adapter has not been checked against a real logged-in account; the page marks the platform as a trial.")
	}).readonly(),
	"post": object({
		"accountId": string$1().readonly(),
		"postId": string$1().readonly().describe("Platform post id, or a stable hash of the URL/title when the platform exposes none."),
		"title": string$1().readonly(),
		"url": union([_undefined(), string$1()]).readonly().optional(),
		"publishedAt": union([_undefined(), string$1()]).readonly().optional().describe("ISO-8601 instant when known."),
		"format": union([
			literal("image"),
			literal("other"),
			literal("video"),
			literal("article")
		]).readonly(),
		"views": union([_undefined(), number$1()]).readonly().optional(),
		"likes": union([_undefined(), number$1()]).readonly().optional(),
		"comments": union([_undefined(), number$1()]).readonly().optional(),
		"collects": union([_undefined(), number$1()]).readonly().optional(),
		"shares": union([_undefined(), number$1()]).readonly().optional(),
		"coverUrl": union([_undefined(), string$1()]).readonly().optional().describe("Cover image URL as the platform served it; platform CDNs sign these URLs, so old ones may stop loading."),
		"extra": record(string$1(), number$1()).readonly().readonly(),
		"source": union([literal("scrape"), literal("import")]).readonly(),
		"updatedAt": string$1().readonly().describe("ISO-8601 instant of the last write.")
	}).readonly(),
	"metrics": array(object({
		"key": union([
			literal("views"),
			literal("likes"),
			literal("comments"),
			literal("shares"),
			literal("collects")
		]).readonly(),
		"label": string$1().readonly(),
		"value": union([_undefined(), number$1()]).readonly().optional(),
		"median": union([_undefined(), number$1()]).readonly().optional().describe("Median of the same counter over the account's other recent posts, when at least three have it.")
	})).readonly(),
	"rates": array(object({
		"key": string$1().readonly(),
		"label": string$1().readonly(),
		"value": number$1().readonly().describe("Fraction, such as 0.034 for 3.4%."),
		"median": union([_undefined(), number$1()]).readonly().optional().describe("Median of the same rate over the account's other recent posts, when at least three have it.")
	})).readonly(),
	"baselinePosts": number$1().readonly().describe("How many of the account's other recent posts the medians come from."),
	"rank": union([_undefined(), object({
		"by": string$1().readonly(),
		"position": number$1().readonly(),
		"of": number$1().readonly()
	})]).readonly().optional().describe("Rank of the post among the account's recent posts by views, or by likes when views are unknown; 1 is best.")
});
let dsh_media_mediaSuite_posts_parameter_0$schema$value;
const dsh_media_mediaSuite_posts_parameter_0$schema = () => dsh_media_mediaSuite_posts_parameter_0$schema$value ??= string$1();
let dsh_media_mediaSuite_posts_parameter_1$schema$value;
const dsh_media_mediaSuite_posts_parameter_1$schema = () => dsh_media_mediaSuite_posts_parameter_1$schema$value ??= number$1();
let dsh_media_mediaSuite_posts_result$schema$value;
const dsh_media_mediaSuite_posts_result$schema = () => dsh_media_mediaSuite_posts_result$schema$value ??= array(object({
	"accountId": string$1().readonly(),
	"postId": string$1().readonly().describe("Platform post id, or a stable hash of the URL/title when the platform exposes none."),
	"title": string$1().readonly(),
	"url": union([_undefined(), string$1()]).readonly().optional(),
	"publishedAt": union([_undefined(), string$1()]).readonly().optional().describe("ISO-8601 instant when known."),
	"format": union([
		literal("image"),
		literal("other"),
		literal("video"),
		literal("article")
	]).readonly(),
	"views": union([_undefined(), number$1()]).readonly().optional(),
	"likes": union([_undefined(), number$1()]).readonly().optional(),
	"comments": union([_undefined(), number$1()]).readonly().optional(),
	"collects": union([_undefined(), number$1()]).readonly().optional(),
	"shares": union([_undefined(), number$1()]).readonly().optional(),
	"coverUrl": union([_undefined(), string$1()]).readonly().optional().describe("Cover image URL as the platform served it; platform CDNs sign these URLs, so old ones may stop loading."),
	"extra": record(string$1(), number$1()).readonly().readonly(),
	"source": union([literal("scrape"), literal("import")]).readonly(),
	"updatedAt": string$1().readonly().describe("ISO-8601 instant of the last write.")
}));
let dsh_media_mediaSuite_refresh_parameter_0$schema$value;
const dsh_media_mediaSuite_refresh_parameter_0$schema = () => dsh_media_mediaSuite_refresh_parameter_0$schema$value ??= string$1();
let dsh_media_mediaSuite_refresh_result$schema$value;
const dsh_media_mediaSuite_refresh_result$schema = () => dsh_media_mediaSuite_refresh_result$schema$value ??= object({
	"accountId": string$1().readonly(),
	"kind": union([literal("scrape"), literal("import")]).readonly(),
	"startedAt": string$1().readonly().describe("ISO-8601 instants."),
	"finishedAt": string$1().readonly(),
	"ok": boolean$1().readonly(),
	"errorCode": union([_undefined(), string$1()]).readonly().optional().describe("Localizable failure code, such as `login-required` or `parse-failed`."),
	"message": union([_undefined(), string$1()]).readonly().optional(),
	"postsWritten": number$1().readonly()
});
let dsh_media_mediaSuite_removeDraft_parameter_0$schema$value;
const dsh_media_mediaSuite_removeDraft_parameter_0$schema = () => dsh_media_mediaSuite_removeDraft_parameter_0$schema$value ??= string$1();
let dsh_media_mediaSuite_removeDraft_result$schema$value;
const dsh_media_mediaSuite_removeDraft_result$schema = () => dsh_media_mediaSuite_removeDraft_result$schema$value ??= _void();
let dsh_media_mediaSuite_revealDraft_parameter_0$schema$value;
const dsh_media_mediaSuite_revealDraft_parameter_0$schema = () => dsh_media_mediaSuite_revealDraft_parameter_0$schema$value ??= string$1();
let dsh_media_mediaSuite_revealDraft_result$schema$value;
const dsh_media_mediaSuite_revealDraft_result$schema = () => dsh_media_mediaSuite_revealDraft_result$schema$value ??= _void();
let dsh_media_mediaSuite_saveAccount_parameter_0$schema$value;
const dsh_media_mediaSuite_saveAccount_parameter_0$schema = () => dsh_media_mediaSuite_saveAccount_parameter_0$schema$value ??= object({
	"id": union([_undefined(), string$1()]).readonly().optional(),
	"platform": string$1().readonly(),
	"role": union([literal("own"), literal("benchmark")]).readonly(),
	"name": string$1().readonly().describe("Display name chosen by the user."),
	"profileUrl": string$1().readonly().describe("Public profile URL used by scraping."),
	"niche": string$1().readonly().describe("Content field, such as `职场成长` or `美食探店`, used by AI prompts."),
	"notes": string$1().readonly().describe("Free-form notes for AI prompts: audience, style, goals."),
	"monitor": object({
		"enabled": boolean$1().readonly(),
		"intervalMinutes": number$1().readonly().describe("Minutes between automatic scrapes; the Host clamps to its configured minimum.")
	}).readonly(),
	"avatarUrl": union([_undefined(), string$1()]).readonly().optional().describe("The account's avatar image on the platform (an https URL), read when scanning in and refreshed by each update.")
});
let dsh_media_mediaSuite_saveAccount_parameter_1$schema$value;
const dsh_media_mediaSuite_saveAccount_parameter_1$schema = () => dsh_media_mediaSuite_saveAccount_parameter_1$schema$value ??= union([_undefined(), string$1()]);
let dsh_media_mediaSuite_saveAccount_result$schema$value;
const dsh_media_mediaSuite_saveAccount_result$schema = () => dsh_media_mediaSuite_saveAccount_result$schema$value ??= object({
	"id": string$1().readonly(),
	"demo": union([_undefined(), literal(true)]).readonly().optional().describe("Set on the sample accounts `loadDemo` creates; they hold made-up data and are never fetched."),
	"loginProfile": union([_undefined(), string$1()]).readonly().optional().describe("Browser profile that keeps this own account's login, set when the account is connected by scanning. Without it the account uses the platform's shared profile, which holds one login at a time."),
	"createdAt": string$1().readonly().describe("ISO-8601 instants."),
	"updatedAt": string$1().readonly(),
	"platform": string$1().readonly(),
	"role": union([literal("own"), literal("benchmark")]).readonly(),
	"name": string$1().readonly().describe("Display name chosen by the user."),
	"profileUrl": string$1().readonly().describe("Public profile URL used by scraping."),
	"niche": string$1().readonly().describe("Content field, such as `职场成长` or `美食探店`, used by AI prompts."),
	"notes": string$1().readonly().describe("Free-form notes for AI prompts: audience, style, goals."),
	"monitor": object({
		"enabled": boolean$1().readonly(),
		"intervalMinutes": number$1().readonly().describe("Minutes between automatic scrapes; the Host clamps to its configured minimum.")
	}).readonly(),
	"avatarUrl": union([_undefined(), string$1()]).readonly().optional().describe("The account's avatar image on the platform (an https URL), read when scanning in and refreshed by each update.")
});
let dsh_media_mediaSuite_startBrief_result$schema$value;
const dsh_media_mediaSuite_startBrief_result$schema = () => dsh_media_mediaSuite_startBrief_result$schema$value ??= object({
	"brief": union([_undefined(), object({
		"id": string$1().readonly(),
		"day": string$1().readonly().describe("China day the brief is for."),
		"createdAt": string$1().readonly(),
		"model": string$1().readonly().describe("`provider/model` that wrote it."),
		"dataAt": union([_undefined(), string$1()]).readonly().optional().describe("Newest capture the brief saw."),
		"items": array(object({
			"kind": union([
				literal("alert"),
				literal("fact"),
				literal("action"),
				literal("topic")
			]).readonly(),
			"text": string$1().readonly(),
			"accountId": union([_undefined(), string$1()]).readonly().optional().describe("The account the line is about, when it names one of the user's accounts."),
			"platform": union([_undefined(), string$1()]).readonly().optional().describe("Platform name the line is about, as the model wrote it."),
			"detail": union([_undefined(), string$1()]).readonly().optional().describe("The longer explanation shown when the line is opened: the numbers behind it and what to do."),
			"post": union([_undefined(), object({
				"accountId": string$1().readonly(),
				"postId": string$1().readonly()
			})]).readonly().optional().describe("The work the line is about, when its title matches one of the recent posts."),
			"metric": union([
				_undefined(),
				literal("followers"),
				literal("fansNet"),
				literal("views"),
				literal("likes"),
				literal("comments"),
				literal("shares"),
				literal("posts")
			]).readonly().optional().describe("The 全网 counter the line is about, so the page can show its numbers.")
		})).readonly()
	})]).readonly().optional(),
	"running": boolean$1().readonly().describe("A brief is being written now; `partial` holds its finished lines."),
	"partial": array(object({
		"kind": union([
			literal("alert"),
			literal("fact"),
			literal("action"),
			literal("topic")
		]).readonly(),
		"text": string$1().readonly(),
		"accountId": union([_undefined(), string$1()]).readonly().optional().describe("The account the line is about, when it names one of the user's accounts."),
		"platform": union([_undefined(), string$1()]).readonly().optional().describe("Platform name the line is about, as the model wrote it."),
		"detail": union([_undefined(), string$1()]).readonly().optional().describe("The longer explanation shown when the line is opened: the numbers behind it and what to do."),
		"post": union([_undefined(), object({
			"accountId": string$1().readonly(),
			"postId": string$1().readonly()
		})]).readonly().optional().describe("The work the line is about, when its title matches one of the recent posts."),
		"metric": union([
			_undefined(),
			literal("followers"),
			literal("fansNet"),
			literal("views"),
			literal("likes"),
			literal("comments"),
			literal("shares"),
			literal("posts")
		]).readonly().optional().describe("The 全网 counter the line is about, so the page can show its numbers.")
	})).readonly(),
	"problem": union([_undefined(), string$1()]).readonly().optional().describe("Why the last attempt failed, until the next one starts."),
	"scheduleAt": string$1().readonly().describe("China time the daily brief is written at, such as `09:00`.")
});
let dsh_media_mediaSuite_studioOpen_result$schema$value;
const dsh_media_mediaSuite_studioOpen_result$schema = () => dsh_media_mediaSuite_studioOpen_result$schema$value ??= union([_undefined(), string$1()]);
let dsh_media_mediaSuite_studioWriteArticle_parameter_0$schema$value;
const dsh_media_mediaSuite_studioWriteArticle_parameter_0$schema = () => dsh_media_mediaSuite_studioWriteArticle_parameter_0$schema$value ??= string$1();
let dsh_media_mediaSuite_studioWriteArticle_parameter_1$schema$value;
const dsh_media_mediaSuite_studioWriteArticle_parameter_1$schema = () => dsh_media_mediaSuite_studioWriteArticle_parameter_1$schema$value ??= number$1();
let dsh_media_mediaSuite_studioWriteArticle_result$schema$value;
const dsh_media_mediaSuite_studioWriteArticle_result$schema = () => dsh_media_mediaSuite_studioWriteArticle_result$schema$value ??= string$1();
let dsh_media_mediaSuite_summary_result$schema$value;
const dsh_media_mediaSuite_summary_result$schema = () => dsh_media_mediaSuite_summary_result$schema$value ??= object({
	"accounts": array(object({
		"account": object({
			"id": string$1().readonly(),
			"demo": union([_undefined(), literal(true)]).readonly().optional().describe("Set on the sample accounts `loadDemo` creates; they hold made-up data and are never fetched."),
			"loginProfile": union([_undefined(), string$1()]).readonly().optional().describe("Browser profile that keeps this own account's login, set when the account is connected by scanning. Without it the account uses the platform's shared profile, which holds one login at a time."),
			"createdAt": string$1().readonly().describe("ISO-8601 instants."),
			"updatedAt": string$1().readonly(),
			"platform": string$1().readonly(),
			"role": union([literal("own"), literal("benchmark")]).readonly(),
			"name": string$1().readonly().describe("Display name chosen by the user."),
			"profileUrl": string$1().readonly().describe("Public profile URL used by scraping."),
			"niche": string$1().readonly().describe("Content field, such as `职场成长` or `美食探店`, used by AI prompts."),
			"notes": string$1().readonly().describe("Free-form notes for AI prompts: audience, style, goals."),
			"monitor": object({
				"enabled": boolean$1().readonly(),
				"intervalMinutes": number$1().readonly().describe("Minutes between automatic scrapes; the Host clamps to its configured minimum.")
			}).readonly(),
			"avatarUrl": union([_undefined(), string$1()]).readonly().optional().describe("The account's avatar image on the platform (an https URL), read when scanning in and refreshed by each update.")
		}).readonly(),
		"platform": object({
			"search": boolean$1().readonly().optional().describe("Whether the platform can search posts, filled in by the registry from the adapter; adapters omit it."),
			"id": string$1().readonly(),
			"displayName": string$1().readonly().describe("Display name in the platform's own language, such as `小红书`."),
			"loginUrl": string$1().readonly().describe("Home page the embedded browser opens for login."),
			"scrape": boolean$1().readonly().describe("Whether the adapter scrapes through the embedded browser."),
			"import": boolean$1().readonly().describe("Whether the adapter maps creator-backend export files."),
			"importHint": string$1().readonly().describe("Short hint describing which export file the user should upload."),
			"profileUrlExample": string$1().readonly().describe("Example profile URL shown as the input placeholder."),
			"metrics": union([_undefined(), object({
				"views": union([_undefined(), string$1()]).readonly().optional(),
				"likes": union([_undefined(), string$1()]).readonly().optional(),
				"comments": union([_undefined(), string$1()]).readonly().optional(),
				"shares": union([_undefined(), string$1()]).readonly().optional(),
				"collects": union([_undefined(), string$1()]).readonly().optional()
			})]).readonly().optional().describe("The platform's own names for the post counters, such as `阅读` for a 公众号's `views`. Counters the platform does not report are left out, so the page and the tools never show a counter that is always empty."),
			"noun": union([_undefined(), string$1()]).readonly().optional().describe("What one post is called on the platform, such as `视频`, `笔记` or `文章`."),
			"color": union([_undefined(), string$1()]).readonly().optional().describe("Brand color (CSS), for the platform's tints and its series in charts; a platform added later brings its own."),
			"beta": union([
				_undefined(),
				literal(false),
				literal(true)
			]).readonly().optional().describe("Set while the adapter has not been checked against a real logged-in account; the page marks the platform as a trial.")
		}).readonly(),
		"health": object({
			"state": union([
				literal("pending"),
				literal("stale"),
				literal("login-required"),
				literal("failing"),
				literal("ok")
			]).readonly(),
			"updatedAt": union([_undefined(), string$1()]).readonly().optional().describe("ISO-8601 instant of the newest stored counters, when any."),
			"errorCode": union([_undefined(), string$1()]).readonly().optional().describe("Failure code of the last run, when it failed."),
			"message": union([_undefined(), string$1()]).readonly().optional().describe("Failure message of the last run, when it failed, in Chinese."),
			"nextRunAt": union([_undefined(), string$1()]).readonly().optional().describe("ISO-8601 instant of the next automatic update, when monitoring is on."),
			"monitored": boolean$1().readonly().describe("Whether automatic updates are on.")
		}).readonly(),
		"headline": array(object({
			"key": string$1().readonly().describe("Stable key: `views`, `likes`, `comments`, `shares`, `collects`, `posts`, `engagement`, `profileViews`, `followers`, `fansNet`, …"),
			"label": string$1().readonly().describe("Display name in the platform's words, such as `阅读量`."),
			"unit": union([
				literal("count"),
				literal("percent"),
				literal("seconds")
			]).readonly(),
			"value": union([_undefined(), number$1()]).readonly().optional().describe("Total over the window, or the newest value for a running total such as followers; undefined when unknown."),
			"change": union([_undefined(), number$1()]).readonly().optional().describe("Relative change against the window of the same length before it, such as 0.12 for +12%; undefined when unknown."),
			"previous": union([_undefined(), number$1()]).readonly().optional().describe("Value over the window of the same length before it; undefined when unknown."),
			"daily": array(object({
				"day": string$1().readonly().describe("`YYYY-MM-DD`, China time."),
				"value": number$1().readonly()
			})).readonly().describe("Daily values inside the window, oldest first; days without data are left out."),
			"hint": string$1().readonly().describe("How the number is counted, in Chinese.")
		})).readonly().describe("Headline counters of the last 7 days."),
		"followers": union([_undefined(), number$1()]).readonly().optional().describe("Newest known follower total."),
		"latestPost": union([_undefined(), object({
			"accountId": string$1().readonly(),
			"postId": string$1().readonly().describe("Platform post id, or a stable hash of the URL/title when the platform exposes none."),
			"title": string$1().readonly(),
			"url": union([_undefined(), string$1()]).readonly().optional(),
			"publishedAt": union([_undefined(), string$1()]).readonly().optional().describe("ISO-8601 instant when known."),
			"format": union([
				literal("image"),
				literal("other"),
				literal("video"),
				literal("article")
			]).readonly(),
			"views": union([_undefined(), number$1()]).readonly().optional(),
			"likes": union([_undefined(), number$1()]).readonly().optional(),
			"comments": union([_undefined(), number$1()]).readonly().optional(),
			"collects": union([_undefined(), number$1()]).readonly().optional(),
			"shares": union([_undefined(), number$1()]).readonly().optional(),
			"coverUrl": union([_undefined(), string$1()]).readonly().optional().describe("Cover image URL as the platform served it; platform CDNs sign these URLs, so old ones may stop loading."),
			"extra": record(string$1(), number$1()).readonly().readonly(),
			"source": union([literal("scrape"), literal("import")]).readonly(),
			"updatedAt": string$1().readonly().describe("ISO-8601 instant of the last write.")
		})]).readonly().optional()
	})).readonly(),
	"latestPosts": array(object({
		"accountId": string$1().readonly(),
		"postId": string$1().readonly().describe("Platform post id, or a stable hash of the URL/title when the platform exposes none."),
		"title": string$1().readonly(),
		"url": union([_undefined(), string$1()]).readonly().optional(),
		"publishedAt": union([_undefined(), string$1()]).readonly().optional().describe("ISO-8601 instant when known."),
		"format": union([
			literal("image"),
			literal("other"),
			literal("video"),
			literal("article")
		]).readonly(),
		"views": union([_undefined(), number$1()]).readonly().optional(),
		"likes": union([_undefined(), number$1()]).readonly().optional(),
		"comments": union([_undefined(), number$1()]).readonly().optional(),
		"collects": union([_undefined(), number$1()]).readonly().optional(),
		"shares": union([_undefined(), number$1()]).readonly().optional(),
		"coverUrl": union([_undefined(), string$1()]).readonly().optional().describe("Cover image URL as the platform served it; platform CDNs sign these URLs, so old ones may stop loading."),
		"extra": record(string$1(), number$1()).readonly().readonly(),
		"source": union([literal("scrape"), literal("import")]).readonly(),
		"updatedAt": string$1().readonly().describe("ISO-8601 instant of the last write.")
	})).readonly().describe("Newest posts of all own accounts, newest first.")
});
let dsh_media_mediaSuite_topicReports_parameter_0$schema$value;
const dsh_media_mediaSuite_topicReports_parameter_0$schema = () => dsh_media_mediaSuite_topicReports_parameter_0$schema$value ??= string$1();
let dsh_media_mediaSuite_topicReports_result$schema$value;
const dsh_media_mediaSuite_topicReports_result$schema = () => dsh_media_mediaSuite_topicReports_result$schema$value ??= array(object({
	"id": string$1().readonly(),
	"accountId": string$1().readonly(),
	"createdAt": string$1().readonly(),
	"model": string$1().readonly().describe("`provider/model` that generated the report."),
	"summary": string$1().readonly(),
	"suggestions": array(object({
		"title": string$1().readonly(),
		"angle": string$1().readonly().describe("Angle or hook that differentiates the topic."),
		"reason": string$1().readonly().describe("Why the topic suits this account, citing data."),
		"format": union([
			literal("image"),
			literal("other"),
			literal("video"),
			literal("article")
		]).readonly(),
		"headlines": array(string$1()).readonly().describe("Candidate post titles."),
		"references": array(string$1()).readonly().describe("Titles of own or benchmark posts that inspired the suggestion."),
		"priority": union([
			literal("high"),
			literal("medium"),
			literal("low")
		]).readonly(),
		"keywords": array(string$1()).readonly().describe("Short platform search keywords for the topic; empty in reports generated before keywords were requested."),
		"related": array(object({
			"postId": string$1().readonly(),
			"title": string$1().readonly(),
			"url": string$1().readonly(),
			"author": string$1().readonly().describe("Author nickname."),
			"coverUrl": union([_undefined(), string$1()]).readonly().optional().describe("Cover image URL as the platform served it; platform CDNs sign these URLs, so old ones may stop loading."),
			"publishedAt": union([_undefined(), string$1()]).readonly().optional().describe("ISO-8601 publish instant."),
			"format": union([
				literal("image"),
				literal("other"),
				literal("video"),
				literal("article")
			]).readonly(),
			"views": union([_undefined(), number$1()]).readonly().optional(),
			"likes": union([_undefined(), number$1()]).readonly().optional(),
			"comments": union([_undefined(), number$1()]).readonly().optional(),
			"collects": union([_undefined(), number$1()]).readonly().optional(),
			"shares": union([_undefined(), number$1()]).readonly().optional()
		})).readonly().describe("Popular platform posts found by searching the keywords, most liked first; empty when search was unavailable."),
		"video": union([_undefined(), object({
			"hook": string$1().readonly().describe("The first line spoken, written to hold the viewer through the first three seconds."),
			"outline": array(string$1()).readonly().describe("Talking points in order, one per segment of the script."),
			"seconds": number$1().readonly().describe("Suggested length in seconds; 0 when the model gave none."),
			"cover": string$1().readonly().describe("Text for the cover image.")
		})]).readonly().optional().describe("Filming plan of a video topic; absent for other formats and in reports generated before the plan was requested.")
	})).readonly(),
	"research": union([_undefined(), object({
		"searches": array(object({
			"keyword": string$1().readonly(),
			"posts": array(object({
				"postId": string$1().readonly(),
				"title": string$1().readonly(),
				"url": string$1().readonly(),
				"author": string$1().readonly().describe("Author nickname."),
				"coverUrl": union([_undefined(), string$1()]).readonly().optional().describe("Cover image URL as the platform served it; platform CDNs sign these URLs, so old ones may stop loading."),
				"publishedAt": union([_undefined(), string$1()]).readonly().optional().describe("ISO-8601 publish instant."),
				"format": union([
					literal("image"),
					literal("other"),
					literal("video"),
					literal("article")
				]).readonly(),
				"views": union([_undefined(), number$1()]).readonly().optional(),
				"likes": union([_undefined(), number$1()]).readonly().optional(),
				"comments": union([_undefined(), number$1()]).readonly().optional(),
				"collects": union([_undefined(), number$1()]).readonly().optional(),
				"shares": union([_undefined(), number$1()]).readonly().optional()
			})).readonly()
		})).readonly().describe("Platform searches for the account's own keywords."),
		"trending": array(object({
			"word": string$1().readonly(),
			"heat": union([_undefined(), number$1()]).readonly().optional().describe("Platform heat score, where reported.")
		})).readonly(),
		"news": array(object({
			"title": string$1().readonly(),
			"url": string$1().readonly(),
			"snippet": string$1().readonly(),
			"publishedAt": union([_undefined(), string$1()]).readonly().optional().describe("ISO-8601 or platform-formatted publish date, where reported.")
		})).readonly(),
		"benchmarksRefreshed": number$1().readonly().describe("Benchmark accounts whose data was refreshed for this report."),
		"notes": array(string$1()).readonly().describe("Sources that were skipped or failed, in Chinese.")
	})]).readonly().optional().describe("Material gathered before generation; absent in reports generated before research existed."),
	"direction": union([_undefined(), string$1()]).readonly().optional().describe("What the user asked this report to be about; absent when no direction was given.")
}));
let dsh_media_mediaSuite_uiSettings_result$schema$value;
const dsh_media_mediaSuite_uiSettings_result$schema = () => dsh_media_mediaSuite_uiSettings_result$schema$value ??= object({
	"title": union([_undefined(), string$1()]).readonly().optional(),
	"accent": union([_undefined(), string$1()]).readonly().optional().describe("Accent color as `#rgb` or `#rrggbb`."),
	"labels": object({
		"today": string$1().optional(),
		"topics": string$1().optional(),
		"studio": string$1().optional(),
		"data": string$1().optional(),
		"accounts": string$1().optional()
	}).readonly().describe("Navigation names by view."),
	"hidden": array(union([
		literal("today"),
		literal("topics"),
		literal("studio"),
		literal("data"),
		literal("accounts")
	])).readonly().describe("Views left out of the navigation; 今天 is never hidden."),
	"today": union([_undefined(), array(union([
		literal("ready"),
		literal("own"),
		literal("todo"),
		literal("numbers"),
		literal("drafts"),
		literal("peers")
	]))]).readonly().optional().describe("今天 panels in the order shown; panels left out are hidden. Undefined keeps the built-in order."),
	"css": string$1().readonly().describe("Free-form styles applied to the page."),
	"problems": array(string$1()).readonly().describe("What could not be understood, in Chinese."),
	"file": union([_undefined(), string$1()]).readonly().optional().describe("The settings file, when one is configured."),
	"writing": union([
		_undefined(),
		literal(false),
		literal(true)
	]).readonly().optional().describe("Whether a creation workbench is configured; without one the page leaves out 写作 and its actions.")
});
let dsh_media_mediaSuite_analysisReports_parameter_0_strict$schema$value;
const dsh_media_mediaSuite_analysisReports_parameter_0_strict$schema = () => dsh_media_mediaSuite_analysisReports_parameter_0_strict$schema$value ??= string$1();
let dsh_media_mediaSuite_analyze_parameter_0_strict$schema$value;
const dsh_media_mediaSuite_analyze_parameter_0_strict$schema = () => dsh_media_mediaSuite_analyze_parameter_0_strict$schema$value ??= string$1();
let dsh_media_mediaSuite_browserClose_parameter_0_strict$schema$value;
const dsh_media_mediaSuite_browserClose_parameter_0_strict$schema = () => dsh_media_mediaSuite_browserClose_parameter_0_strict$schema$value ??= string$1();
let dsh_media_mediaSuite_browserFrames_parameter_0_strict$schema$value;
const dsh_media_mediaSuite_browserFrames_parameter_0_strict$schema = () => dsh_media_mediaSuite_browserFrames_parameter_0_strict$schema$value ??= string$1();
let dsh_media_mediaSuite_browserInput_parameter_0_strict$schema$value;
const dsh_media_mediaSuite_browserInput_parameter_0_strict$schema = () => dsh_media_mediaSuite_browserInput_parameter_0_strict$schema$value ??= string$1();
let dsh_media_mediaSuite_browserInput_parameter_1_strict$schema$value;
const dsh_media_mediaSuite_browserInput_parameter_1_strict$schema = () => dsh_media_mediaSuite_browserInput_parameter_1_strict$schema$value ??= union([
	strictObject({
		"kind": literal("click").readonly(),
		"x": number$1().readonly(),
		"y": number$1().readonly(),
		"button": union([literal("left"), literal("right")]).readonly()
	}),
	strictObject({
		"kind": literal("down").readonly(),
		"x": number$1().readonly(),
		"y": number$1().readonly(),
		"button": union([literal("left"), literal("right")]).readonly()
	}),
	strictObject({
		"kind": literal("up").readonly(),
		"x": number$1().readonly(),
		"y": number$1().readonly(),
		"button": union([literal("left"), literal("right")]).readonly()
	}),
	strictObject({
		"kind": literal("move").readonly(),
		"x": number$1().readonly(),
		"y": number$1().readonly()
	}),
	strictObject({
		"kind": literal("wheel").readonly(),
		"x": number$1().readonly(),
		"y": number$1().readonly(),
		"deltaX": number$1().readonly(),
		"deltaY": number$1().readonly()
	}),
	strictObject({
		"kind": literal("key").readonly(),
		"key": string$1().readonly()
	}),
	strictObject({
		"kind": literal("text").readonly(),
		"text": string$1().readonly()
	}),
	strictObject({
		"kind": literal("navigate").readonly(),
		"url": string$1().readonly()
	}),
	strictObject({ "kind": literal("back").readonly() }),
	strictObject({ "kind": literal("reload").readonly() })
]);
let dsh_media_mediaSuite_browserOpen_parameter_0_strict$schema$value;
const dsh_media_mediaSuite_browserOpen_parameter_0_strict$schema = () => dsh_media_mediaSuite_browserOpen_parameter_0_strict$schema$value ??= string$1();
let dsh_media_mediaSuite_browserOpen_parameter_1_strict$schema$value;
const dsh_media_mediaSuite_browserOpen_parameter_1_strict$schema = () => dsh_media_mediaSuite_browserOpen_parameter_1_strict$schema$value ??= union([_undefined(), string$1()]);
let dsh_media_mediaSuite_browserOpen_parameter_2_strict$schema$value;
const dsh_media_mediaSuite_browserOpen_parameter_2_strict$schema = () => dsh_media_mediaSuite_browserOpen_parameter_2_strict$schema$value ??= union([_undefined(), string$1()]);
let dsh_media_mediaSuite_browserOpen_parameter_3_strict$schema$value;
const dsh_media_mediaSuite_browserOpen_parameter_3_strict$schema = () => dsh_media_mediaSuite_browserOpen_parameter_3_strict$schema$value ??= union([
	_undefined(),
	literal(false),
	literal(true)
]);
let dsh_media_mediaSuite_dashboard_parameter_0_strict$schema$value;
const dsh_media_mediaSuite_dashboard_parameter_0_strict$schema = () => dsh_media_mediaSuite_dashboard_parameter_0_strict$schema$value ??= string$1();
let dsh_media_mediaSuite_dashboard_parameter_1_strict$schema$value;
const dsh_media_mediaSuite_dashboard_parameter_1_strict$schema = () => dsh_media_mediaSuite_dashboard_parameter_1_strict$schema$value ??= number$1();
let dsh_media_mediaSuite_deleteAccount_parameter_0_strict$schema$value;
const dsh_media_mediaSuite_deleteAccount_parameter_0_strict$schema = () => dsh_media_mediaSuite_deleteAccount_parameter_0_strict$schema$value ??= string$1();
let dsh_media_mediaSuite_findRelated_parameter_0_strict$schema$value;
const dsh_media_mediaSuite_findRelated_parameter_0_strict$schema = () => dsh_media_mediaSuite_findRelated_parameter_0_strict$schema$value ??= string$1();
let dsh_media_mediaSuite_generateTopics_parameter_0_strict$schema$value;
const dsh_media_mediaSuite_generateTopics_parameter_0_strict$schema = () => dsh_media_mediaSuite_generateTopics_parameter_0_strict$schema$value ??= string$1();
let dsh_media_mediaSuite_generateTopicsAbout_parameter_0_strict$schema$value;
const dsh_media_mediaSuite_generateTopicsAbout_parameter_0_strict$schema = () => dsh_media_mediaSuite_generateTopicsAbout_parameter_0_strict$schema$value ??= string$1();
let dsh_media_mediaSuite_generateTopicsAbout_parameter_1_strict$schema$value;
const dsh_media_mediaSuite_generateTopicsAbout_parameter_1_strict$schema = () => dsh_media_mediaSuite_generateTopicsAbout_parameter_1_strict$schema$value ??= string$1();
let dsh_media_mediaSuite_identify_parameter_0_strict$schema$value;
const dsh_media_mediaSuite_identify_parameter_0_strict$schema = () => dsh_media_mediaSuite_identify_parameter_0_strict$schema$value ??= string$1();
let dsh_media_mediaSuite_importFile_parameter_0_strict$schema$value;
const dsh_media_mediaSuite_importFile_parameter_0_strict$schema = () => dsh_media_mediaSuite_importFile_parameter_0_strict$schema$value ??= string$1();
let dsh_media_mediaSuite_importFile_parameter_1_strict$schema$value;
const dsh_media_mediaSuite_importFile_parameter_1_strict$schema = () => dsh_media_mediaSuite_importFile_parameter_1_strict$schema$value ??= string$1();
let dsh_media_mediaSuite_importFile_parameter_2_strict$schema$value;
const dsh_media_mediaSuite_importFile_parameter_2_strict$schema = () => dsh_media_mediaSuite_importFile_parameter_2_strict$schema$value ??= string$1();
let dsh_media_mediaSuite_loginState_parameter_0_strict$schema$value;
const dsh_media_mediaSuite_loginState_parameter_0_strict$schema = () => dsh_media_mediaSuite_loginState_parameter_0_strict$schema$value ??= string$1();
let dsh_media_mediaSuite_loginState_parameter_1_strict$schema$value;
const dsh_media_mediaSuite_loginState_parameter_1_strict$schema = () => dsh_media_mediaSuite_loginState_parameter_1_strict$schema$value ??= union([_undefined(), string$1()]);
let dsh_media_mediaSuite_markDraftPublished_parameter_0_strict$schema$value;
const dsh_media_mediaSuite_markDraftPublished_parameter_0_strict$schema = () => dsh_media_mediaSuite_markDraftPublished_parameter_0_strict$schema$value ??= string$1();
let dsh_media_mediaSuite_markDraftPublished_parameter_1_strict$schema$value;
const dsh_media_mediaSuite_markDraftPublished_parameter_1_strict$schema = () => dsh_media_mediaSuite_markDraftPublished_parameter_1_strict$schema$value ??= string$1();
let dsh_media_mediaSuite_network_parameter_0_strict$schema$value;
const dsh_media_mediaSuite_network_parameter_0_strict$schema = () => dsh_media_mediaSuite_network_parameter_0_strict$schema$value ??= number$1();
let dsh_media_mediaSuite_overview_parameter_0_strict$schema$value;
const dsh_media_mediaSuite_overview_parameter_0_strict$schema = () => dsh_media_mediaSuite_overview_parameter_0_strict$schema$value ??= string$1();
let dsh_media_mediaSuite_overview_parameter_1_strict$schema$value;
const dsh_media_mediaSuite_overview_parameter_1_strict$schema = () => dsh_media_mediaSuite_overview_parameter_1_strict$schema$value ??= number$1();
let dsh_media_mediaSuite_postDetail_parameter_0_strict$schema$value;
const dsh_media_mediaSuite_postDetail_parameter_0_strict$schema = () => dsh_media_mediaSuite_postDetail_parameter_0_strict$schema$value ??= string$1();
let dsh_media_mediaSuite_postDetail_parameter_1_strict$schema$value;
const dsh_media_mediaSuite_postDetail_parameter_1_strict$schema = () => dsh_media_mediaSuite_postDetail_parameter_1_strict$schema$value ??= string$1();
let dsh_media_mediaSuite_posts_parameter_0_strict$schema$value;
const dsh_media_mediaSuite_posts_parameter_0_strict$schema = () => dsh_media_mediaSuite_posts_parameter_0_strict$schema$value ??= string$1();
let dsh_media_mediaSuite_posts_parameter_1_strict$schema$value;
const dsh_media_mediaSuite_posts_parameter_1_strict$schema = () => dsh_media_mediaSuite_posts_parameter_1_strict$schema$value ??= number$1();
let dsh_media_mediaSuite_refresh_parameter_0_strict$schema$value;
const dsh_media_mediaSuite_refresh_parameter_0_strict$schema = () => dsh_media_mediaSuite_refresh_parameter_0_strict$schema$value ??= string$1();
let dsh_media_mediaSuite_removeDraft_parameter_0_strict$schema$value;
const dsh_media_mediaSuite_removeDraft_parameter_0_strict$schema = () => dsh_media_mediaSuite_removeDraft_parameter_0_strict$schema$value ??= string$1();
let dsh_media_mediaSuite_revealDraft_parameter_0_strict$schema$value;
const dsh_media_mediaSuite_revealDraft_parameter_0_strict$schema = () => dsh_media_mediaSuite_revealDraft_parameter_0_strict$schema$value ??= string$1();
let dsh_media_mediaSuite_saveAccount_parameter_0_strict$schema$value;
const dsh_media_mediaSuite_saveAccount_parameter_0_strict$schema = () => dsh_media_mediaSuite_saveAccount_parameter_0_strict$schema$value ??= strictObject({
	"id": union([_undefined(), string$1()]).readonly().optional(),
	"platform": string$1().readonly(),
	"role": union([literal("own"), literal("benchmark")]).readonly(),
	"name": string$1().readonly().describe("Display name chosen by the user."),
	"profileUrl": string$1().readonly().describe("Public profile URL used by scraping."),
	"niche": string$1().readonly().describe("Content field, such as `职场成长` or `美食探店`, used by AI prompts."),
	"notes": string$1().readonly().describe("Free-form notes for AI prompts: audience, style, goals."),
	"monitor": strictObject({
		"enabled": boolean$1().readonly(),
		"intervalMinutes": number$1().readonly().describe("Minutes between automatic scrapes; the Host clamps to its configured minimum.")
	}).readonly(),
	"avatarUrl": union([_undefined(), string$1()]).readonly().optional().describe("The account's avatar image on the platform (an https URL), read when scanning in and refreshed by each update.")
});
let dsh_media_mediaSuite_saveAccount_parameter_1_strict$schema$value;
const dsh_media_mediaSuite_saveAccount_parameter_1_strict$schema = () => dsh_media_mediaSuite_saveAccount_parameter_1_strict$schema$value ??= union([_undefined(), string$1()]);
let dsh_media_mediaSuite_studioWriteArticle_parameter_0_strict$schema$value;
const dsh_media_mediaSuite_studioWriteArticle_parameter_0_strict$schema = () => dsh_media_mediaSuite_studioWriteArticle_parameter_0_strict$schema$value ??= string$1();
let dsh_media_mediaSuite_studioWriteArticle_parameter_1_strict$schema$value;
const dsh_media_mediaSuite_studioWriteArticle_parameter_1_strict$schema = () => dsh_media_mediaSuite_studioWriteArticle_parameter_1_strict$schema$value ??= number$1();
let dsh_media_mediaSuite_topicReports_parameter_0_strict$schema$value;
const dsh_media_mediaSuite_topicReports_parameter_0_strict$schema = () => dsh_media_mediaSuite_topicReports_parameter_0_strict$schema$value ??= string$1();
const $remote = createTypertRemoteInfo({
	package: "dsh-media",
	methods: {
		"mediaSuite/accounts": {
			service: "mediaSuite",
			description: "List configured accounts.",
			invocation: { kind: "direct" },
			parameters: [],
			result: {
				mode: "strict",
				typeSymbol: "dsh-media#mediaSuite/accounts:result",
				create: dsh_media_mediaSuite_accounts_result$schema,
				description: "accounts in creation order.",
				jsonSchema: {
					"type": "array",
					"items": {
						"type": "object",
						"properties": {
							"id": { "type": "string" },
							"demo": {
								"type": "boolean",
								"const": true,
								"description": "Set on the sample accounts `loadDemo` creates; they hold made-up data and are never fetched."
							},
							"loginProfile": {
								"type": "string",
								"description": "Browser profile that keeps this own account's login, set when the account is connected by scanning. Without it the account uses the platform's shared profile, which holds one login at a time."
							},
							"createdAt": {
								"type": "string",
								"description": "ISO-8601 instants."
							},
							"updatedAt": { "type": "string" },
							"platform": { "type": "string" },
							"role": {
								"type": "string",
								"enum": ["own", "benchmark"]
							},
							"name": {
								"type": "string",
								"description": "Display name chosen by the user."
							},
							"profileUrl": {
								"type": "string",
								"description": "Public profile URL used by scraping."
							},
							"niche": {
								"type": "string",
								"description": "Content field, such as `职场成长` or `美食探店`, used by AI prompts."
							},
							"notes": {
								"type": "string",
								"description": "Free-form notes for AI prompts: audience, style, goals."
							},
							"monitor": {
								"type": "object",
								"properties": {
									"enabled": { "type": "boolean" },
									"intervalMinutes": {
										"type": "number",
										"description": "Minutes between automatic scrapes; the Host clamps to its configured minimum."
									}
								},
								"required": ["enabled", "intervalMinutes"],
								"additionalProperties": true
							},
							"avatarUrl": {
								"type": "string",
								"description": "The account's avatar image on the platform (an https URL), read when scanning in and refreshed by each update."
							}
						},
						"required": [
							"id",
							"createdAt",
							"updatedAt",
							"platform",
							"role",
							"name",
							"profileUrl",
							"niche",
							"notes",
							"monitor"
						],
						"additionalProperties": true
					}
				}
			},
			sourceLocation: {
				"file": "packages/experimental/media-suite/src/index.ts",
				"line": 415,
				"column": 3
			}
		},
		"mediaSuite/analysisReports": {
			service: "mediaSuite",
			description: "List stored diagnosis reports.",
			invocation: { kind: "direct" },
			parameters: [{
				name: "id",
				description: "account id.",
				source: "json",
				codec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaAccountId",
					create: dsh_media_mediaSuite_analysisReports_parameter_0$schema,
					jsonSchema: { "type": "string" }
				},
				strictCodec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaAccountId",
					create: dsh_media_mediaSuite_analysisReports_parameter_0_strict$schema,
					jsonSchema: { "type": "string" }
				}
			}],
			result: {
				mode: "strict",
				typeSymbol: "dsh-media#mediaSuite/analysisReports:result",
				create: dsh_media_mediaSuite_analysisReports_result$schema,
				description: "reports, newest first.",
				jsonSchema: {
					"type": "array",
					"items": {
						"type": "object",
						"properties": {
							"id": { "type": "string" },
							"accountId": { "type": "string" },
							"createdAt": { "type": "string" },
							"model": { "type": "string" },
							"summary": { "type": "string" },
							"strengths": {
								"type": "array",
								"items": { "type": "string" }
							},
							"items": {
								"type": "array",
								"items": {
									"type": "object",
									"properties": {
										"area": {
											"type": "string",
											"description": "Area such as `发布节奏`, `标题封面`, `互动转化`, `内容方向`."
										},
										"finding": { "type": "string" },
										"evidence": {
											"type": "string",
											"description": "Numbers or posts that support the finding."
										},
										"action": {
											"type": "string",
											"description": "Concrete next step."
										},
										"priority": {
											"type": "string",
											"enum": [
												"high",
												"medium",
												"low"
											]
										}
									},
									"required": [
										"area",
										"finding",
										"evidence",
										"action",
										"priority"
									],
									"additionalProperties": true
								}
							}
						},
						"required": [
							"id",
							"accountId",
							"createdAt",
							"model",
							"summary",
							"strengths",
							"items"
						],
						"additionalProperties": true
					}
				}
			},
			sourceLocation: {
				"file": "packages/experimental/media-suite/src/index.ts",
				"line": 1357,
				"column": 3
			}
		},
		"mediaSuite/analyze": {
			service: "mediaSuite",
			description: "Generate and store a diagnosis of what an own account should improve over the analysis window.",
			invocation: { kind: "direct" },
			parameters: [{
				name: "id",
				description: "own account id.",
				source: "json",
				codec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaAccountId",
					create: dsh_media_mediaSuite_analyze_parameter_0$schema,
					jsonSchema: { "type": "string" }
				},
				strictCodec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaAccountId",
					create: dsh_media_mediaSuite_analyze_parameter_0_strict$schema,
					jsonSchema: { "type": "string" }
				}
			}],
			cancellation: { parameter: "signal" },
			result: {
				mode: "strict",
				typeSymbol: "dsh-media/types#MediaAnalysisReport",
				create: dsh_media_mediaSuite_analyze_result$schema,
				description: "the stored report.",
				jsonSchema: {
					"type": "object",
					"properties": {
						"id": { "type": "string" },
						"accountId": { "type": "string" },
						"createdAt": { "type": "string" },
						"model": { "type": "string" },
						"summary": { "type": "string" },
						"strengths": {
							"type": "array",
							"items": { "type": "string" }
						},
						"items": {
							"type": "array",
							"items": {
								"type": "object",
								"properties": {
									"area": {
										"type": "string",
										"description": "Area such as `发布节奏`, `标题封面`, `互动转化`, `内容方向`."
									},
									"finding": { "type": "string" },
									"evidence": {
										"type": "string",
										"description": "Numbers or posts that support the finding."
									},
									"action": {
										"type": "string",
										"description": "Concrete next step."
									},
									"priority": {
										"type": "string",
										"enum": [
											"high",
											"medium",
											"low"
										]
									}
								},
								"required": [
									"area",
									"finding",
									"evidence",
									"action",
									"priority"
								],
								"additionalProperties": true
							}
						}
					},
					"required": [
						"id",
						"accountId",
						"createdAt",
						"model",
						"summary",
						"strengths",
						"items"
					],
					"additionalProperties": true
				}
			},
			sourceLocation: {
				"file": "packages/experimental/media-suite/src/index.ts",
				"line": 1331,
				"column": 9
			}
		},
		"mediaSuite/brief": {
			service: "mediaSuite",
			description: "The 今日简报 as the page polls it: the newest one, and the finished lines of one being written.",
			invocation: { kind: "direct" },
			parameters: [],
			result: {
				mode: "strict",
				typeSymbol: "dsh-media/types#MediaBriefState",
				create: dsh_media_mediaSuite_brief_result$schema,
				description: "the state.",
				jsonSchema: {
					"type": "object",
					"properties": {
						"brief": {
							"type": "object",
							"properties": {
								"id": { "type": "string" },
								"day": {
									"type": "string",
									"description": "China day the brief is for."
								},
								"createdAt": { "type": "string" },
								"model": {
									"type": "string",
									"description": "`provider/model` that wrote it."
								},
								"dataAt": {
									"type": "string",
									"description": "Newest capture the brief saw."
								},
								"items": {
									"type": "array",
									"items": {
										"type": "object",
										"properties": {
											"kind": {
												"type": "string",
												"enum": [
													"alert",
													"fact",
													"action",
													"topic"
												]
											},
											"text": { "type": "string" },
											"accountId": {
												"type": "string",
												"description": "The account the line is about, when it names one of the user's accounts."
											},
											"platform": {
												"type": "string",
												"description": "Platform name the line is about, as the model wrote it."
											},
											"detail": {
												"type": "string",
												"description": "The longer explanation shown when the line is opened: the numbers behind it and what to do."
											},
											"post": {
												"type": "object",
												"properties": {
													"accountId": { "type": "string" },
													"postId": { "type": "string" }
												},
												"required": ["accountId", "postId"],
												"additionalProperties": true,
												"description": "The work the line is about, when its title matches one of the recent posts."
											},
											"metric": {
												"type": "string",
												"enum": [
													"followers",
													"fansNet",
													"views",
													"likes",
													"comments",
													"shares",
													"posts"
												],
												"description": "The 全网 counter the line is about, so the page can show its numbers."
											}
										},
										"required": ["kind", "text"],
										"additionalProperties": true
									}
								}
							},
							"required": [
								"id",
								"day",
								"createdAt",
								"model",
								"items"
							],
							"additionalProperties": true
						},
						"running": {
							"type": "boolean",
							"description": "A brief is being written now; `partial` holds its finished lines."
						},
						"partial": {
							"type": "array",
							"items": {
								"type": "object",
								"properties": {
									"kind": {
										"type": "string",
										"enum": [
											"alert",
											"fact",
											"action",
											"topic"
										]
									},
									"text": { "type": "string" },
									"accountId": {
										"type": "string",
										"description": "The account the line is about, when it names one of the user's accounts."
									},
									"platform": {
										"type": "string",
										"description": "Platform name the line is about, as the model wrote it."
									},
									"detail": {
										"type": "string",
										"description": "The longer explanation shown when the line is opened: the numbers behind it and what to do."
									},
									"post": {
										"type": "object",
										"properties": {
											"accountId": { "type": "string" },
											"postId": { "type": "string" }
										},
										"required": ["accountId", "postId"],
										"additionalProperties": true,
										"description": "The work the line is about, when its title matches one of the recent posts."
									},
									"metric": {
										"type": "string",
										"enum": [
											"followers",
											"fansNet",
											"views",
											"likes",
											"comments",
											"shares",
											"posts"
										],
										"description": "The 全网 counter the line is about, so the page can show its numbers."
									}
								},
								"required": ["kind", "text"],
								"additionalProperties": true
							}
						},
						"problem": {
							"type": "string",
							"description": "Why the last attempt failed, until the next one starts."
						},
						"scheduleAt": {
							"type": "string",
							"description": "China time the daily brief is written at, such as `09:00`."
						}
					},
					"required": [
						"running",
						"partial",
						"scheduleAt"
					],
					"additionalProperties": true
				}
			},
			sourceLocation: {
				"file": "packages/experimental/media-suite/src/index.ts",
				"line": 763,
				"column": 3
			}
		},
		"mediaSuite/browserClose": {
			service: "mediaSuite",
			description: "Close an embedded view.",
			invocation: { kind: "direct" },
			parameters: [{
				name: "id",
				description: "view id; closing a closed view does nothing.",
				source: "json",
				codec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaBrowserId",
					create: dsh_media_mediaSuite_browserClose_parameter_0$schema,
					jsonSchema: { "type": "string" }
				},
				strictCodec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaBrowserId",
					create: dsh_media_mediaSuite_browserClose_parameter_0_strict$schema,
					jsonSchema: { "type": "string" }
				}
			}],
			result: {
				mode: "strict",
				typeSymbol: "dsh-media#mediaSuite/browserClose:result",
				create: dsh_media_mediaSuite_browserClose_result$schema,
				description: "after the page closed.",
				jsonSchemaError: "typert tool schema: unsupported void value"
			},
			sourceLocation: {
				"file": "packages/experimental/media-suite/src/index.ts",
				"line": 1550,
				"column": 9
			}
		},
		"mediaSuite/browserFrames": {
			service: "mediaSuite",
			description: "Follow an embedded view: the latest frame and login state, then JPEG frames and login changes, ending with `closed`.",
			mode: "stream",
			invocation: { kind: "direct" },
			parameters: [{
				name: "id",
				description: "view id.",
				source: "json",
				codec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaBrowserId",
					create: dsh_media_mediaSuite_browserFrames_parameter_0$schema,
					jsonSchema: { "type": "string" }
				},
				strictCodec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaBrowserId",
					create: dsh_media_mediaSuite_browserFrames_parameter_0_strict$schema,
					jsonSchema: { "type": "string" }
				}
			}],
			cancellation: { parameter: "signal" },
			result: {
				mode: "strict",
				typeSymbol: "dsh-media/types#MediaBrowserFrame",
				create: dsh_media_mediaSuite_browserFrames_result$schema,
				description: "the frame stream.",
				jsonSchema: { "oneOf": [
					{
						"type": "object",
						"properties": {
							"kind": {
								"type": "string",
								"const": "frame"
							},
							"data": { "type": "string" },
							"width": { "type": "number" },
							"height": { "type": "number" },
							"url": { "type": "string" },
							"title": { "type": "string" },
							"loading": {
								"type": "boolean",
								"enum": [false, true],
								"description": "Whether the page is still loading (Chrome's own loading state of the main frame), for the panel's progress bar."
							}
						},
						"required": [
							"kind",
							"data",
							"width",
							"height",
							"url",
							"title"
						],
						"additionalProperties": true
					},
					{
						"type": "object",
						"properties": {
							"kind": {
								"type": "string",
								"const": "login"
							},
							"state": {
								"type": "string",
								"enum": [
									"unknown",
									"logged-in",
									"logged-out"
								]
							}
						},
						"required": ["kind", "state"],
						"additionalProperties": true
					},
					{
						"type": "object",
						"properties": {
							"kind": {
								"type": "string",
								"const": "qr"
							},
							"data": { "type": "string" },
							"width": { "type": "number" },
							"height": { "type": "number" }
						},
						"required": [
							"kind",
							"width",
							"height"
						],
						"additionalProperties": true
					},
					{
						"type": "object",
						"properties": {
							"kind": {
								"type": "string",
								"const": "identity"
							},
							"identity": {
								"type": "object",
								"properties": {
									"platform": { "type": "string" },
									"name": {
										"type": "string",
										"description": "Platform nickname."
									},
									"profileUrl": {
										"type": "string",
										"description": "Canonical profile URL usable as MediaAccountDraft.profileUrl."
									},
									"avatarUrl": {
										"type": "string",
										"description": "Avatar image URL, when the platform showed one."
									},
									"existingAccountId": {
										"type": "string",
										"description": "Existing own account with the same platform and profile URL, if any."
									}
								},
								"required": [
									"platform",
									"name",
									"profileUrl"
								],
								"additionalProperties": true
							}
						},
						"required": ["kind", "identity"],
						"additionalProperties": true
					},
					{
						"type": "object",
						"properties": {
							"kind": {
								"type": "string",
								"const": "closed"
							},
							"reason": { "type": "string" }
						},
						"required": ["kind", "reason"],
						"additionalProperties": true
					}
				] }
			},
			sourceLocation: {
				"file": "packages/experimental/media-suite/src/index.ts",
				"line": 1466,
				"column": 10
			}
		},
		"mediaSuite/browserInput": {
			service: "mediaSuite",
			description: "Forward panel input to an embedded view.",
			invocation: { kind: "direct" },
			parameters: [{
				name: "id",
				description: "view id.",
				source: "json",
				codec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaBrowserId",
					create: dsh_media_mediaSuite_browserInput_parameter_0$schema,
					jsonSchema: { "type": "string" }
				},
				strictCodec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaBrowserId",
					create: dsh_media_mediaSuite_browserInput_parameter_0_strict$schema,
					jsonSchema: { "type": "string" }
				}
			}, {
				name: "input",
				description: "pointer, key, text or navigation input in viewport pixels.",
				source: "json",
				codec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaBrowserInput",
					create: dsh_media_mediaSuite_browserInput_parameter_1$schema,
					jsonSchema: { "oneOf": [
						{
							"type": "object",
							"properties": {
								"kind": {
									"type": "string",
									"const": "click"
								},
								"x": { "type": "number" },
								"y": { "type": "number" },
								"button": {
									"type": "string",
									"enum": ["left", "right"]
								}
							},
							"required": [
								"kind",
								"x",
								"y",
								"button"
							],
							"additionalProperties": true
						},
						{
							"type": "object",
							"properties": {
								"kind": {
									"type": "string",
									"const": "down"
								},
								"x": { "type": "number" },
								"y": { "type": "number" },
								"button": {
									"type": "string",
									"enum": ["left", "right"]
								}
							},
							"required": [
								"kind",
								"x",
								"y",
								"button"
							],
							"additionalProperties": true
						},
						{
							"type": "object",
							"properties": {
								"kind": {
									"type": "string",
									"const": "up"
								},
								"x": { "type": "number" },
								"y": { "type": "number" },
								"button": {
									"type": "string",
									"enum": ["left", "right"]
								}
							},
							"required": [
								"kind",
								"x",
								"y",
								"button"
							],
							"additionalProperties": true
						},
						{
							"type": "object",
							"properties": {
								"kind": {
									"type": "string",
									"const": "move"
								},
								"x": { "type": "number" },
								"y": { "type": "number" }
							},
							"required": [
								"kind",
								"x",
								"y"
							],
							"additionalProperties": true
						},
						{
							"type": "object",
							"properties": {
								"kind": {
									"type": "string",
									"const": "wheel"
								},
								"x": { "type": "number" },
								"y": { "type": "number" },
								"deltaX": { "type": "number" },
								"deltaY": { "type": "number" }
							},
							"required": [
								"kind",
								"x",
								"y",
								"deltaX",
								"deltaY"
							],
							"additionalProperties": true
						},
						{
							"type": "object",
							"properties": {
								"kind": {
									"type": "string",
									"const": "key"
								},
								"key": { "type": "string" }
							},
							"required": ["kind", "key"],
							"additionalProperties": true
						},
						{
							"type": "object",
							"properties": {
								"kind": {
									"type": "string",
									"const": "text"
								},
								"text": { "type": "string" }
							},
							"required": ["kind", "text"],
							"additionalProperties": true
						},
						{
							"type": "object",
							"properties": {
								"kind": {
									"type": "string",
									"const": "navigate"
								},
								"url": { "type": "string" }
							},
							"required": ["kind", "url"],
							"additionalProperties": true
						},
						{
							"type": "object",
							"properties": { "kind": {
								"type": "string",
								"const": "back"
							} },
							"required": ["kind"],
							"additionalProperties": true
						},
						{
							"type": "object",
							"properties": { "kind": {
								"type": "string",
								"const": "reload"
							} },
							"required": ["kind"],
							"additionalProperties": true
						}
					] }
				},
				strictCodec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaBrowserInput",
					create: dsh_media_mediaSuite_browserInput_parameter_1_strict$schema,
					jsonSchema: { "oneOf": [
						{
							"type": "object",
							"properties": {
								"kind": {
									"type": "string",
									"const": "click"
								},
								"x": { "type": "number" },
								"y": { "type": "number" },
								"button": {
									"type": "string",
									"enum": ["left", "right"]
								}
							},
							"required": [
								"kind",
								"x",
								"y",
								"button"
							],
							"additionalProperties": false
						},
						{
							"type": "object",
							"properties": {
								"kind": {
									"type": "string",
									"const": "down"
								},
								"x": { "type": "number" },
								"y": { "type": "number" },
								"button": {
									"type": "string",
									"enum": ["left", "right"]
								}
							},
							"required": [
								"kind",
								"x",
								"y",
								"button"
							],
							"additionalProperties": false
						},
						{
							"type": "object",
							"properties": {
								"kind": {
									"type": "string",
									"const": "up"
								},
								"x": { "type": "number" },
								"y": { "type": "number" },
								"button": {
									"type": "string",
									"enum": ["left", "right"]
								}
							},
							"required": [
								"kind",
								"x",
								"y",
								"button"
							],
							"additionalProperties": false
						},
						{
							"type": "object",
							"properties": {
								"kind": {
									"type": "string",
									"const": "move"
								},
								"x": { "type": "number" },
								"y": { "type": "number" }
							},
							"required": [
								"kind",
								"x",
								"y"
							],
							"additionalProperties": false
						},
						{
							"type": "object",
							"properties": {
								"kind": {
									"type": "string",
									"const": "wheel"
								},
								"x": { "type": "number" },
								"y": { "type": "number" },
								"deltaX": { "type": "number" },
								"deltaY": { "type": "number" }
							},
							"required": [
								"kind",
								"x",
								"y",
								"deltaX",
								"deltaY"
							],
							"additionalProperties": false
						},
						{
							"type": "object",
							"properties": {
								"kind": {
									"type": "string",
									"const": "key"
								},
								"key": { "type": "string" }
							},
							"required": ["kind", "key"],
							"additionalProperties": false
						},
						{
							"type": "object",
							"properties": {
								"kind": {
									"type": "string",
									"const": "text"
								},
								"text": { "type": "string" }
							},
							"required": ["kind", "text"],
							"additionalProperties": false
						},
						{
							"type": "object",
							"properties": {
								"kind": {
									"type": "string",
									"const": "navigate"
								},
								"url": { "type": "string" }
							},
							"required": ["kind", "url"],
							"additionalProperties": false
						},
						{
							"type": "object",
							"properties": { "kind": {
								"type": "string",
								"const": "back"
							} },
							"required": ["kind"],
							"additionalProperties": false
						},
						{
							"type": "object",
							"properties": { "kind": {
								"type": "string",
								"const": "reload"
							} },
							"required": ["kind"],
							"additionalProperties": false
						}
					] }
				}
			}],
			result: {
				mode: "strict",
				typeSymbol: "dsh-media#mediaSuite/browserInput:result",
				create: dsh_media_mediaSuite_browserInput_result$schema,
				description: "after the input is dispatched.",
				jsonSchemaError: "typert tool schema: unsupported void value"
			},
			sourceLocation: {
				"file": "packages/experimental/media-suite/src/index.ts",
				"line": 1479,
				"column": 9
			}
		},
		"mediaSuite/browserOpen": {
			service: "mediaSuite",
			description: "Open an embedded headless browser view in a persistent profile.",
			invocation: { kind: "direct" },
			parameters: [
				{
					name: "platform",
					description: "platform id.",
					source: "json",
					codec: {
						mode: "strict",
						typeSymbol: "dsh-media/types#MediaPlatformId",
						create: dsh_media_mediaSuite_browserOpen_parameter_0$schema,
						jsonSchema: { "type": "string" }
					},
					strictCodec: {
						mode: "strict",
						typeSymbol: "dsh-media/types#MediaPlatformId",
						create: dsh_media_mediaSuite_browserOpen_parameter_0_strict$schema,
						jsonSchema: { "type": "string" }
					}
				},
				{
					name: "url",
					description: "first URL; defaults to the platform's login page.",
					source: "json",
					acceptsUndefined: true,
					codec: {
						mode: "strict",
						typeSymbol: "dsh-media#mediaSuite/browserOpen:url",
						create: dsh_media_mediaSuite_browserOpen_parameter_1$schema,
						jsonSchema: { "type": "string" }
					},
					strictCodec: {
						mode: "strict",
						typeSymbol: "dsh-media#mediaSuite/browserOpen:url",
						create: dsh_media_mediaSuite_browserOpen_parameter_1_strict$schema,
						jsonSchema: { "type": "string" }
					}
				},
				{
					name: "account",
					description: "account whose profile the view opens in; without it, the platform's shared profile.",
					source: "json",
					acceptsUndefined: true,
					codec: {
						mode: "strict",
						typeSymbol: "dsh-media/types#MediaAccountId",
						create: dsh_media_mediaSuite_browserOpen_parameter_2$schema,
						jsonSchema: { "type": "string" }
					},
					strictCodec: {
						mode: "strict",
						typeSymbol: "dsh-media/types#MediaAccountId",
						create: dsh_media_mediaSuite_browserOpen_parameter_2_strict$schema,
						jsonSchema: { "type": "string" }
					}
				},
				{
					name: "fresh",
					description: "open a new, empty account profile instead, to scan in another account of the platform while the accounts already connected stay logged in. Saving the account with this view keeps the profile; otherwise it is deleted on a later start.",
					source: "json",
					acceptsUndefined: true,
					codec: {
						mode: "strict",
						typeSymbol: "dsh-media#mediaSuite/browserOpen:fresh",
						create: dsh_media_mediaSuite_browserOpen_parameter_3$schema,
						jsonSchema: {
							"type": "boolean",
							"enum": [false, true]
						}
					},
					strictCodec: {
						mode: "strict",
						typeSymbol: "dsh-media#mediaSuite/browserOpen:fresh",
						create: dsh_media_mediaSuite_browserOpen_parameter_3_strict$schema,
						jsonSchema: {
							"type": "boolean",
							"enum": [false, true]
						}
					}
				}
			],
			result: {
				mode: "strict",
				typeSymbol: "dsh-media/types#MediaBrowserView",
				create: dsh_media_mediaSuite_browserOpen_result$schema,
				description: "the view id and viewport size.",
				jsonSchema: {
					"type": "object",
					"properties": {
						"id": { "type": "string" },
						"platform": { "type": "string" },
						"width": { "type": "number" },
						"height": { "type": "number" }
					},
					"required": [
						"id",
						"platform",
						"width",
						"height"
					],
					"additionalProperties": true
				}
			},
			sourceLocation: {
				"file": "packages/experimental/media-suite/src/index.ts",
				"line": 1440,
				"column": 9
			}
		},
		"mediaSuite/clearDemo": {
			service: "mediaSuite",
			description: "Delete every sample account with its data, and the sample drafts.",
			invocation: { kind: "direct" },
			parameters: [],
			result: {
				mode: "strict",
				typeSymbol: "dsh-media#mediaSuite/clearDemo:result",
				create: dsh_media_mediaSuite_clearDemo_result$schema,
				description: "how many sample accounts were deleted.",
				jsonSchema: { "type": "number" }
			},
			sourceLocation: {
				"file": "packages/experimental/media-suite/src/index.ts",
				"line": 623,
				"column": 3
			}
		},
		"mediaSuite/dashboard": {
			service: "mediaSuite",
			description: "Everything the dashboard of one account shows.",
			invocation: { kind: "direct" },
			parameters: [{
				name: "id",
				description: "account id.",
				source: "json",
				codec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaAccountId",
					create: dsh_media_mediaSuite_dashboard_parameter_0$schema,
					jsonSchema: { "type": "string" }
				},
				strictCodec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaAccountId",
					create: dsh_media_mediaSuite_dashboard_parameter_0_strict$schema,
					jsonSchema: { "type": "string" }
				}
			}, {
				name: "days",
				description: "window in whole days ending yesterday, clamped to 1..90.",
				source: "json",
				codec: {
					mode: "strict",
					typeSymbol: "dsh-media#mediaSuite/dashboard:days",
					create: dsh_media_mediaSuite_dashboard_parameter_1$schema,
					jsonSchema: { "type": "number" }
				},
				strictCodec: {
					mode: "strict",
					typeSymbol: "dsh-media#mediaSuite/dashboard:days",
					create: dsh_media_mediaSuite_dashboard_parameter_1_strict$schema,
					jsonSchema: { "type": "number" }
				}
			}],
			result: {
				mode: "strict",
				typeSymbol: "dsh-media/types#MediaDashboard",
				create: dsh_media_mediaSuite_dashboard_result$schema,
				description: "health, the 7-day headline, the works and fans counters over the window, top posts and newest posts.",
				jsonSchemaError: "typert tool schema: selected dictionaries require string keys and unconstrained JSON values"
			},
			sourceLocation: {
				"file": "packages/experimental/media-suite/src/index.ts",
				"line": 842,
				"column": 3
			}
		},
		"mediaSuite/deleteAccount": {
			service: "mediaSuite",
			description: "Delete an account with its snapshots, posts, runs and reports.",
			invocation: { kind: "direct" },
			parameters: [{
				name: "id",
				description: "account id.",
				source: "json",
				codec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaAccountId",
					create: dsh_media_mediaSuite_deleteAccount_parameter_0$schema,
					jsonSchema: { "type": "string" }
				},
				strictCodec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaAccountId",
					create: dsh_media_mediaSuite_deleteAccount_parameter_0_strict$schema,
					jsonSchema: { "type": "string" }
				}
			}],
			result: {
				mode: "strict",
				typeSymbol: "dsh-media#mediaSuite/deleteAccount:result",
				create: dsh_media_mediaSuite_deleteAccount_result$schema,
				jsonSchemaError: "typert tool schema: unsupported void value"
			},
			sourceLocation: {
				"file": "packages/experimental/media-suite/src/index.ts",
				"line": 509,
				"column": 3
			}
		},
		"mediaSuite/drafts": {
			service: "mediaSuite",
			description: "List the drafts, newest first.",
			invocation: { kind: "direct" },
			parameters: [],
			result: {
				mode: "strict",
				typeSymbol: "dsh-media#mediaSuite/drafts:result",
				create: dsh_media_mediaSuite_drafts_result$schema,
				description: "drafts waiting to be published and published ones.",
				jsonSchema: {
					"type": "array",
					"items": {
						"type": "object",
						"properties": {
							"id": { "type": "string" },
							"createdAt": { "type": "string" },
							"publishedUrl": {
								"type": "string",
								"description": "Address of the published post; its counters come from the fetched posts with the same address."
							},
							"publishedAt": { "type": "string" },
							"demo": {
								"type": "boolean",
								"const": true,
								"description": "Set on drafts `loadDemo` creates."
							},
							"source": {
								"type": "string",
								"description": "Name of the tool that made it, shown beside the title, such as 宣传片工坊."
							},
							"kind": {
								"type": "string",
								"enum": [
									"video",
									"article",
									"card"
								]
							},
							"title": { "type": "string" },
							"file": {
								"type": "string",
								"description": "Absolute path of the finished file, when there is one."
							},
							"folder": {
								"type": "string",
								"description": "Absolute path of the folder that holds the work."
							},
							"note": {
								"type": "string",
								"description": "One line about the content, such as its ratio and length."
							},
							"studioProject": {
								"type": "string",
								"description": "Creation-workbench project id of an article or card set."
							}
						},
						"required": [
							"id",
							"createdAt",
							"source",
							"kind",
							"title"
						],
						"additionalProperties": true
					}
				}
			},
			sourceLocation: {
				"file": "packages/experimental/media-suite/src/index.ts",
				"line": 551,
				"column": 3
			}
		},
		"mediaSuite/findRelated": {
			service: "mediaSuite",
			description: "Search the platform for each suggestion of a stored topic report again and store the most liked results, for a report generated before related posts existed or whose related posts are stale. Suggestions without keywords are searched by title. A search that fails keeps the suggestion's previous related posts and adds a note.",
			invocation: { kind: "direct" },
			parameters: [{
				name: "id",
				description: "report id.",
				source: "json",
				codec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaReportId",
					create: dsh_media_mediaSuite_findRelated_parameter_0$schema,
					jsonSchema: { "type": "string" }
				},
				strictCodec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaReportId",
					create: dsh_media_mediaSuite_findRelated_parameter_0_strict$schema,
					jsonSchema: { "type": "string" }
				}
			}],
			cancellation: { parameter: "signal" },
			result: {
				mode: "strict",
				typeSymbol: "dsh-media/types#MediaTopicReport",
				create: dsh_media_mediaSuite_findRelated_result$schema,
				description: "the updated report.",
				jsonSchema: {
					"type": "object",
					"properties": {
						"id": { "type": "string" },
						"accountId": { "type": "string" },
						"createdAt": { "type": "string" },
						"model": {
							"type": "string",
							"description": "`provider/model` that generated the report."
						},
						"summary": { "type": "string" },
						"suggestions": {
							"type": "array",
							"items": {
								"type": "object",
								"properties": {
									"title": { "type": "string" },
									"angle": {
										"type": "string",
										"description": "Angle or hook that differentiates the topic."
									},
									"reason": {
										"type": "string",
										"description": "Why the topic suits this account, citing data."
									},
									"format": {
										"type": "string",
										"enum": [
											"image",
											"other",
											"video",
											"article"
										]
									},
									"headlines": {
										"type": "array",
										"items": { "type": "string" },
										"description": "Candidate post titles."
									},
									"references": {
										"type": "array",
										"items": { "type": "string" },
										"description": "Titles of own or benchmark posts that inspired the suggestion."
									},
									"priority": {
										"type": "string",
										"enum": [
											"high",
											"medium",
											"low"
										]
									},
									"keywords": {
										"type": "array",
										"items": { "type": "string" },
										"description": "Short platform search keywords for the topic; empty in reports generated before keywords were requested."
									},
									"related": {
										"type": "array",
										"items": {
											"type": "object",
											"properties": {
												"postId": { "type": "string" },
												"title": { "type": "string" },
												"url": { "type": "string" },
												"author": {
													"type": "string",
													"description": "Author nickname."
												},
												"coverUrl": {
													"type": "string",
													"description": "Cover image URL as the platform served it; platform CDNs sign these URLs, so old ones may stop loading."
												},
												"publishedAt": {
													"type": "string",
													"description": "ISO-8601 publish instant."
												},
												"format": {
													"type": "string",
													"enum": [
														"image",
														"other",
														"video",
														"article"
													]
												},
												"views": { "type": "number" },
												"likes": { "type": "number" },
												"comments": { "type": "number" },
												"collects": { "type": "number" },
												"shares": { "type": "number" }
											},
											"required": [
												"postId",
												"title",
												"url",
												"author",
												"format"
											],
											"additionalProperties": true
										},
										"description": "Popular platform posts found by searching the keywords, most liked first; empty when search was unavailable."
									},
									"video": {
										"type": "object",
										"properties": {
											"hook": {
												"type": "string",
												"description": "The first line spoken, written to hold the viewer through the first three seconds."
											},
											"outline": {
												"type": "array",
												"items": { "type": "string" },
												"description": "Talking points in order, one per segment of the script."
											},
											"seconds": {
												"type": "number",
												"description": "Suggested length in seconds; 0 when the model gave none."
											},
											"cover": {
												"type": "string",
												"description": "Text for the cover image."
											}
										},
										"required": [
											"hook",
											"outline",
											"seconds",
											"cover"
										],
										"additionalProperties": true,
										"description": "Filming plan of a video topic; absent for other formats and in reports generated before the plan was requested."
									}
								},
								"required": [
									"title",
									"angle",
									"reason",
									"format",
									"headlines",
									"references",
									"priority",
									"keywords",
									"related"
								],
								"additionalProperties": true
							}
						},
						"research": {
							"type": "object",
							"properties": {
								"searches": {
									"type": "array",
									"items": {
										"type": "object",
										"properties": {
											"keyword": { "type": "string" },
											"posts": {
												"type": "array",
												"items": {
													"type": "object",
													"properties": {
														"postId": { "type": "string" },
														"title": { "type": "string" },
														"url": { "type": "string" },
														"author": {
															"type": "string",
															"description": "Author nickname."
														},
														"coverUrl": {
															"type": "string",
															"description": "Cover image URL as the platform served it; platform CDNs sign these URLs, so old ones may stop loading."
														},
														"publishedAt": {
															"type": "string",
															"description": "ISO-8601 publish instant."
														},
														"format": {
															"type": "string",
															"enum": [
																"image",
																"other",
																"video",
																"article"
															]
														},
														"views": { "type": "number" },
														"likes": { "type": "number" },
														"comments": { "type": "number" },
														"collects": { "type": "number" },
														"shares": { "type": "number" }
													},
													"required": [
														"postId",
														"title",
														"url",
														"author",
														"format"
													],
													"additionalProperties": true
												}
											}
										},
										"required": ["keyword", "posts"],
										"additionalProperties": true
									},
									"description": "Platform searches for the account's own keywords."
								},
								"trending": {
									"type": "array",
									"items": {
										"type": "object",
										"properties": {
											"word": { "type": "string" },
											"heat": {
												"type": "number",
												"description": "Platform heat score, where reported."
											}
										},
										"required": ["word"],
										"additionalProperties": true
									}
								},
								"news": {
									"type": "array",
									"items": {
										"type": "object",
										"properties": {
											"title": { "type": "string" },
											"url": { "type": "string" },
											"snippet": { "type": "string" },
											"publishedAt": {
												"type": "string",
												"description": "ISO-8601 or platform-formatted publish date, where reported."
											}
										},
										"required": [
											"title",
											"url",
											"snippet"
										],
										"additionalProperties": true
									}
								},
								"benchmarksRefreshed": {
									"type": "number",
									"description": "Benchmark accounts whose data was refreshed for this report."
								},
								"notes": {
									"type": "array",
									"items": { "type": "string" },
									"description": "Sources that were skipped or failed, in Chinese."
								}
							},
							"required": [
								"searches",
								"trending",
								"news",
								"benchmarksRefreshed",
								"notes"
							],
							"additionalProperties": true,
							"description": "Material gathered before generation; absent in reports generated before research existed."
						},
						"direction": {
							"type": "string",
							"description": "What the user asked this report to be about; absent when no direction was given."
						}
					},
					"required": [
						"id",
						"accountId",
						"createdAt",
						"model",
						"summary",
						"suggestions"
					],
					"additionalProperties": true
				}
			},
			sourceLocation: {
				"file": "packages/experimental/media-suite/src/index.ts",
				"line": 1184,
				"column": 9
			}
		},
		"mediaSuite/generateTopics": {
			service: "mediaSuite",
			description: "Generate and store a topic report. Research comes first: stale benchmark accounts are scraped again, and the platform's trending list, platform searches for the account's own keywords and web news are read. The model sees all of it with the account's posts and the titles recent reports already suggested, and returns search keywords per topic; each topic's keywords are then searched on the platform and the best results are attached. A research source that fails is skipped with a note.",
			invocation: { kind: "direct" },
			parameters: [{
				name: "id",
				description: "account id.",
				source: "json",
				codec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaAccountId",
					create: dsh_media_mediaSuite_generateTopics_parameter_0$schema,
					jsonSchema: { "type": "string" }
				},
				strictCodec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaAccountId",
					create: dsh_media_mediaSuite_generateTopics_parameter_0_strict$schema,
					jsonSchema: { "type": "string" }
				}
			}],
			cancellation: { parameter: "signal" },
			result: {
				mode: "strict",
				typeSymbol: "dsh-media/types#MediaTopicReport",
				create: dsh_media_mediaSuite_generateTopics_result$schema,
				description: "the stored report.",
				jsonSchema: {
					"type": "object",
					"properties": {
						"id": { "type": "string" },
						"accountId": { "type": "string" },
						"createdAt": { "type": "string" },
						"model": {
							"type": "string",
							"description": "`provider/model` that generated the report."
						},
						"summary": { "type": "string" },
						"suggestions": {
							"type": "array",
							"items": {
								"type": "object",
								"properties": {
									"title": { "type": "string" },
									"angle": {
										"type": "string",
										"description": "Angle or hook that differentiates the topic."
									},
									"reason": {
										"type": "string",
										"description": "Why the topic suits this account, citing data."
									},
									"format": {
										"type": "string",
										"enum": [
											"image",
											"other",
											"video",
											"article"
										]
									},
									"headlines": {
										"type": "array",
										"items": { "type": "string" },
										"description": "Candidate post titles."
									},
									"references": {
										"type": "array",
										"items": { "type": "string" },
										"description": "Titles of own or benchmark posts that inspired the suggestion."
									},
									"priority": {
										"type": "string",
										"enum": [
											"high",
											"medium",
											"low"
										]
									},
									"keywords": {
										"type": "array",
										"items": { "type": "string" },
										"description": "Short platform search keywords for the topic; empty in reports generated before keywords were requested."
									},
									"related": {
										"type": "array",
										"items": {
											"type": "object",
											"properties": {
												"postId": { "type": "string" },
												"title": { "type": "string" },
												"url": { "type": "string" },
												"author": {
													"type": "string",
													"description": "Author nickname."
												},
												"coverUrl": {
													"type": "string",
													"description": "Cover image URL as the platform served it; platform CDNs sign these URLs, so old ones may stop loading."
												},
												"publishedAt": {
													"type": "string",
													"description": "ISO-8601 publish instant."
												},
												"format": {
													"type": "string",
													"enum": [
														"image",
														"other",
														"video",
														"article"
													]
												},
												"views": { "type": "number" },
												"likes": { "type": "number" },
												"comments": { "type": "number" },
												"collects": { "type": "number" },
												"shares": { "type": "number" }
											},
											"required": [
												"postId",
												"title",
												"url",
												"author",
												"format"
											],
											"additionalProperties": true
										},
										"description": "Popular platform posts found by searching the keywords, most liked first; empty when search was unavailable."
									},
									"video": {
										"type": "object",
										"properties": {
											"hook": {
												"type": "string",
												"description": "The first line spoken, written to hold the viewer through the first three seconds."
											},
											"outline": {
												"type": "array",
												"items": { "type": "string" },
												"description": "Talking points in order, one per segment of the script."
											},
											"seconds": {
												"type": "number",
												"description": "Suggested length in seconds; 0 when the model gave none."
											},
											"cover": {
												"type": "string",
												"description": "Text for the cover image."
											}
										},
										"required": [
											"hook",
											"outline",
											"seconds",
											"cover"
										],
										"additionalProperties": true,
										"description": "Filming plan of a video topic; absent for other formats and in reports generated before the plan was requested."
									}
								},
								"required": [
									"title",
									"angle",
									"reason",
									"format",
									"headlines",
									"references",
									"priority",
									"keywords",
									"related"
								],
								"additionalProperties": true
							}
						},
						"research": {
							"type": "object",
							"properties": {
								"searches": {
									"type": "array",
									"items": {
										"type": "object",
										"properties": {
											"keyword": { "type": "string" },
											"posts": {
												"type": "array",
												"items": {
													"type": "object",
													"properties": {
														"postId": { "type": "string" },
														"title": { "type": "string" },
														"url": { "type": "string" },
														"author": {
															"type": "string",
															"description": "Author nickname."
														},
														"coverUrl": {
															"type": "string",
															"description": "Cover image URL as the platform served it; platform CDNs sign these URLs, so old ones may stop loading."
														},
														"publishedAt": {
															"type": "string",
															"description": "ISO-8601 publish instant."
														},
														"format": {
															"type": "string",
															"enum": [
																"image",
																"other",
																"video",
																"article"
															]
														},
														"views": { "type": "number" },
														"likes": { "type": "number" },
														"comments": { "type": "number" },
														"collects": { "type": "number" },
														"shares": { "type": "number" }
													},
													"required": [
														"postId",
														"title",
														"url",
														"author",
														"format"
													],
													"additionalProperties": true
												}
											}
										},
										"required": ["keyword", "posts"],
										"additionalProperties": true
									},
									"description": "Platform searches for the account's own keywords."
								},
								"trending": {
									"type": "array",
									"items": {
										"type": "object",
										"properties": {
											"word": { "type": "string" },
											"heat": {
												"type": "number",
												"description": "Platform heat score, where reported."
											}
										},
										"required": ["word"],
										"additionalProperties": true
									}
								},
								"news": {
									"type": "array",
									"items": {
										"type": "object",
										"properties": {
											"title": { "type": "string" },
											"url": { "type": "string" },
											"snippet": { "type": "string" },
											"publishedAt": {
												"type": "string",
												"description": "ISO-8601 or platform-formatted publish date, where reported."
											}
										},
										"required": [
											"title",
											"url",
											"snippet"
										],
										"additionalProperties": true
									}
								},
								"benchmarksRefreshed": {
									"type": "number",
									"description": "Benchmark accounts whose data was refreshed for this report."
								},
								"notes": {
									"type": "array",
									"items": { "type": "string" },
									"description": "Sources that were skipped or failed, in Chinese."
								}
							},
							"required": [
								"searches",
								"trending",
								"news",
								"benchmarksRefreshed",
								"notes"
							],
							"additionalProperties": true,
							"description": "Material gathered before generation; absent in reports generated before research existed."
						},
						"direction": {
							"type": "string",
							"description": "What the user asked this report to be about; absent when no direction was given."
						}
					},
					"required": [
						"id",
						"accountId",
						"createdAt",
						"model",
						"summary",
						"suggestions"
					],
					"additionalProperties": true
				}
			},
			sourceLocation: {
				"file": "packages/experimental/media-suite/src/index.ts",
				"line": 1015,
				"column": 9
			}
		},
		"mediaSuite/generateTopicsAbout": {
			service: "mediaSuite",
			description: "Generate and store a topic report about a direction the user names, such as a theme, a product or an event. Everything else is as in {@link MediaSuite.generateTopics}.",
			invocation: { kind: "direct" },
			parameters: [{
				name: "id",
				description: "account id.",
				source: "json",
				codec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaAccountId",
					create: dsh_media_mediaSuite_generateTopicsAbout_parameter_0$schema,
					jsonSchema: { "type": "string" }
				},
				strictCodec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaAccountId",
					create: dsh_media_mediaSuite_generateTopicsAbout_parameter_0_strict$schema,
					jsonSchema: { "type": "string" }
				}
			}, {
				name: "direction",
				description: "what the topics should be about, in the user's words; blank means no direction.",
				source: "json",
				codec: {
					mode: "strict",
					typeSymbol: "dsh-media#mediaSuite/generateTopicsAbout:direction",
					create: dsh_media_mediaSuite_generateTopicsAbout_parameter_1$schema,
					jsonSchema: { "type": "string" }
				},
				strictCodec: {
					mode: "strict",
					typeSymbol: "dsh-media#mediaSuite/generateTopicsAbout:direction",
					create: dsh_media_mediaSuite_generateTopicsAbout_parameter_1_strict$schema,
					jsonSchema: { "type": "string" }
				}
			}],
			cancellation: { parameter: "signal" },
			result: {
				mode: "strict",
				typeSymbol: "dsh-media/types#MediaTopicReport",
				create: dsh_media_mediaSuite_generateTopicsAbout_result$schema,
				description: "the stored report, which records the direction.",
				jsonSchema: {
					"type": "object",
					"properties": {
						"id": { "type": "string" },
						"accountId": { "type": "string" },
						"createdAt": { "type": "string" },
						"model": {
							"type": "string",
							"description": "`provider/model` that generated the report."
						},
						"summary": { "type": "string" },
						"suggestions": {
							"type": "array",
							"items": {
								"type": "object",
								"properties": {
									"title": { "type": "string" },
									"angle": {
										"type": "string",
										"description": "Angle or hook that differentiates the topic."
									},
									"reason": {
										"type": "string",
										"description": "Why the topic suits this account, citing data."
									},
									"format": {
										"type": "string",
										"enum": [
											"image",
											"other",
											"video",
											"article"
										]
									},
									"headlines": {
										"type": "array",
										"items": { "type": "string" },
										"description": "Candidate post titles."
									},
									"references": {
										"type": "array",
										"items": { "type": "string" },
										"description": "Titles of own or benchmark posts that inspired the suggestion."
									},
									"priority": {
										"type": "string",
										"enum": [
											"high",
											"medium",
											"low"
										]
									},
									"keywords": {
										"type": "array",
										"items": { "type": "string" },
										"description": "Short platform search keywords for the topic; empty in reports generated before keywords were requested."
									},
									"related": {
										"type": "array",
										"items": {
											"type": "object",
											"properties": {
												"postId": { "type": "string" },
												"title": { "type": "string" },
												"url": { "type": "string" },
												"author": {
													"type": "string",
													"description": "Author nickname."
												},
												"coverUrl": {
													"type": "string",
													"description": "Cover image URL as the platform served it; platform CDNs sign these URLs, so old ones may stop loading."
												},
												"publishedAt": {
													"type": "string",
													"description": "ISO-8601 publish instant."
												},
												"format": {
													"type": "string",
													"enum": [
														"image",
														"other",
														"video",
														"article"
													]
												},
												"views": { "type": "number" },
												"likes": { "type": "number" },
												"comments": { "type": "number" },
												"collects": { "type": "number" },
												"shares": { "type": "number" }
											},
											"required": [
												"postId",
												"title",
												"url",
												"author",
												"format"
											],
											"additionalProperties": true
										},
										"description": "Popular platform posts found by searching the keywords, most liked first; empty when search was unavailable."
									},
									"video": {
										"type": "object",
										"properties": {
											"hook": {
												"type": "string",
												"description": "The first line spoken, written to hold the viewer through the first three seconds."
											},
											"outline": {
												"type": "array",
												"items": { "type": "string" },
												"description": "Talking points in order, one per segment of the script."
											},
											"seconds": {
												"type": "number",
												"description": "Suggested length in seconds; 0 when the model gave none."
											},
											"cover": {
												"type": "string",
												"description": "Text for the cover image."
											}
										},
										"required": [
											"hook",
											"outline",
											"seconds",
											"cover"
										],
										"additionalProperties": true,
										"description": "Filming plan of a video topic; absent for other formats and in reports generated before the plan was requested."
									}
								},
								"required": [
									"title",
									"angle",
									"reason",
									"format",
									"headlines",
									"references",
									"priority",
									"keywords",
									"related"
								],
								"additionalProperties": true
							}
						},
						"research": {
							"type": "object",
							"properties": {
								"searches": {
									"type": "array",
									"items": {
										"type": "object",
										"properties": {
											"keyword": { "type": "string" },
											"posts": {
												"type": "array",
												"items": {
													"type": "object",
													"properties": {
														"postId": { "type": "string" },
														"title": { "type": "string" },
														"url": { "type": "string" },
														"author": {
															"type": "string",
															"description": "Author nickname."
														},
														"coverUrl": {
															"type": "string",
															"description": "Cover image URL as the platform served it; platform CDNs sign these URLs, so old ones may stop loading."
														},
														"publishedAt": {
															"type": "string",
															"description": "ISO-8601 publish instant."
														},
														"format": {
															"type": "string",
															"enum": [
																"image",
																"other",
																"video",
																"article"
															]
														},
														"views": { "type": "number" },
														"likes": { "type": "number" },
														"comments": { "type": "number" },
														"collects": { "type": "number" },
														"shares": { "type": "number" }
													},
													"required": [
														"postId",
														"title",
														"url",
														"author",
														"format"
													],
													"additionalProperties": true
												}
											}
										},
										"required": ["keyword", "posts"],
										"additionalProperties": true
									},
									"description": "Platform searches for the account's own keywords."
								},
								"trending": {
									"type": "array",
									"items": {
										"type": "object",
										"properties": {
											"word": { "type": "string" },
											"heat": {
												"type": "number",
												"description": "Platform heat score, where reported."
											}
										},
										"required": ["word"],
										"additionalProperties": true
									}
								},
								"news": {
									"type": "array",
									"items": {
										"type": "object",
										"properties": {
											"title": { "type": "string" },
											"url": { "type": "string" },
											"snippet": { "type": "string" },
											"publishedAt": {
												"type": "string",
												"description": "ISO-8601 or platform-formatted publish date, where reported."
											}
										},
										"required": [
											"title",
											"url",
											"snippet"
										],
										"additionalProperties": true
									}
								},
								"benchmarksRefreshed": {
									"type": "number",
									"description": "Benchmark accounts whose data was refreshed for this report."
								},
								"notes": {
									"type": "array",
									"items": { "type": "string" },
									"description": "Sources that were skipped or failed, in Chinese."
								}
							},
							"required": [
								"searches",
								"trending",
								"news",
								"benchmarksRefreshed",
								"notes"
							],
							"additionalProperties": true,
							"description": "Material gathered before generation; absent in reports generated before research existed."
						},
						"direction": {
							"type": "string",
							"description": "What the user asked this report to be about; absent when no direction was given."
						}
					},
					"required": [
						"id",
						"accountId",
						"createdAt",
						"model",
						"summary",
						"suggestions"
					],
					"additionalProperties": true
				}
			},
			sourceLocation: {
				"file": "packages/experimental/media-suite/src/index.ts",
				"line": 1030,
				"column": 9
			}
		},
		"mediaSuite/identify": {
			service: "mediaSuite",
			description: "Identify the account logged in to an embedded view's profile, for adding it as an own account. The view itself is not navigated.",
			invocation: { kind: "direct" },
			parameters: [{
				name: "id",
				description: "open view.",
				source: "json",
				codec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaBrowserId",
					create: dsh_media_mediaSuite_identify_parameter_0$schema,
					jsonSchema: { "type": "string" }
				},
				strictCodec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaBrowserId",
					create: dsh_media_mediaSuite_identify_parameter_0_strict$schema,
					jsonSchema: { "type": "string" }
				}
			}],
			cancellation: { parameter: "signal" },
			result: {
				mode: "strict",
				typeSymbol: "dsh-media/types#MediaAccountIdentity",
				create: dsh_media_mediaSuite_identify_result$schema,
				description: "nickname, canonical profile URL and the matching stored own account, if any.",
				jsonSchema: {
					"type": "object",
					"properties": {
						"platform": { "type": "string" },
						"name": {
							"type": "string",
							"description": "Platform nickname."
						},
						"profileUrl": {
							"type": "string",
							"description": "Canonical profile URL usable as MediaAccountDraft.profileUrl."
						},
						"avatarUrl": {
							"type": "string",
							"description": "Avatar image URL, when the platform showed one."
						},
						"existingAccountId": {
							"type": "string",
							"description": "Existing own account with the same platform and profile URL, if any."
						}
					},
					"required": [
						"platform",
						"name",
						"profileUrl"
					],
					"additionalProperties": true
				}
			},
			sourceLocation: {
				"file": "packages/experimental/media-suite/src/index.ts",
				"line": 1504,
				"column": 9
			}
		},
		"mediaSuite/importFile": {
			service: "mediaSuite",
			description: "Import a creator-backend export file (xlsx, xls, csv in UTF-8 or GBK).",
			invocation: { kind: "direct" },
			parameters: [
				{
					name: "id",
					description: "account id.",
					source: "json",
					codec: {
						mode: "strict",
						typeSymbol: "dsh-media/types#MediaAccountId",
						create: dsh_media_mediaSuite_importFile_parameter_0$schema,
						jsonSchema: { "type": "string" }
					},
					strictCodec: {
						mode: "strict",
						typeSymbol: "dsh-media/types#MediaAccountId",
						create: dsh_media_mediaSuite_importFile_parameter_0_strict$schema,
						jsonSchema: { "type": "string" }
					}
				},
				{
					name: "fileName",
					description: "original file name; the extension selects CSV decoding.",
					source: "json",
					codec: {
						mode: "strict",
						typeSymbol: "dsh-media#mediaSuite/importFile:fileName",
						create: dsh_media_mediaSuite_importFile_parameter_1$schema,
						jsonSchema: { "type": "string" }
					},
					strictCodec: {
						mode: "strict",
						typeSymbol: "dsh-media#mediaSuite/importFile:fileName",
						create: dsh_media_mediaSuite_importFile_parameter_1_strict$schema,
						jsonSchema: { "type": "string" }
					}
				},
				{
					name: "base64",
					description: "file content.",
					source: "json",
					codec: {
						mode: "strict",
						typeSymbol: "dsh-media#mediaSuite/importFile:base64",
						create: dsh_media_mediaSuite_importFile_parameter_2$schema,
						jsonSchema: { "type": "string" }
					},
					strictCodec: {
						mode: "strict",
						typeSymbol: "dsh-media#mediaSuite/importFile:base64",
						create: dsh_media_mediaSuite_importFile_parameter_2_strict$schema,
						jsonSchema: { "type": "string" }
					}
				}
			],
			result: {
				mode: "strict",
				typeSymbol: "dsh-media/types#MediaImportResult",
				create: dsh_media_mediaSuite_importFile_result$schema,
				description: "what was written and which headers were not recognized.",
				jsonSchema: {
					"type": "object",
					"properties": {
						"snapshotWritten": { "type": "boolean" },
						"postsWritten": { "type": "number" },
						"unmappedColumns": {
							"type": "array",
							"items": { "type": "string" },
							"description": "Header names that matched no known column."
						}
					},
					"required": [
						"snapshotWritten",
						"postsWritten",
						"unmappedColumns"
					],
					"additionalProperties": true
				}
			},
			sourceLocation: {
				"file": "packages/experimental/media-suite/src/index.ts",
				"line": 964,
				"column": 9
			}
		},
		"mediaSuite/loadDemo": {
			service: "mediaSuite",
			description: "Add the sample accounts, counters, posts, reports and drafts for a demonstration, replacing earlier sample data.",
			invocation: { kind: "direct" },
			parameters: [],
			result: {
				mode: "strict",
				typeSymbol: "dsh-media/types#MediaAccount",
				create: dsh_media_mediaSuite_loadDemo_result$schema,
				description: "the sample own account.",
				jsonSchema: {
					"type": "object",
					"properties": {
						"id": { "type": "string" },
						"demo": {
							"type": "boolean",
							"const": true,
							"description": "Set on the sample accounts `loadDemo` creates; they hold made-up data and are never fetched."
						},
						"loginProfile": {
							"type": "string",
							"description": "Browser profile that keeps this own account's login, set when the account is connected by scanning. Without it the account uses the platform's shared profile, which holds one login at a time."
						},
						"createdAt": {
							"type": "string",
							"description": "ISO-8601 instants."
						},
						"updatedAt": { "type": "string" },
						"platform": { "type": "string" },
						"role": {
							"type": "string",
							"enum": ["own", "benchmark"]
						},
						"name": {
							"type": "string",
							"description": "Display name chosen by the user."
						},
						"profileUrl": {
							"type": "string",
							"description": "Public profile URL used by scraping."
						},
						"niche": {
							"type": "string",
							"description": "Content field, such as `职场成长` or `美食探店`, used by AI prompts."
						},
						"notes": {
							"type": "string",
							"description": "Free-form notes for AI prompts: audience, style, goals."
						},
						"monitor": {
							"type": "object",
							"properties": {
								"enabled": { "type": "boolean" },
								"intervalMinutes": {
									"type": "number",
									"description": "Minutes between automatic scrapes; the Host clamps to its configured minimum."
								}
							},
							"required": ["enabled", "intervalMinutes"],
							"additionalProperties": true
						},
						"avatarUrl": {
							"type": "string",
							"description": "The account's avatar image on the platform (an https URL), read when scanning in and refreshed by each update."
						}
					},
					"required": [
						"id",
						"createdAt",
						"updatedAt",
						"platform",
						"role",
						"name",
						"profileUrl",
						"niche",
						"notes",
						"monitor"
					],
					"additionalProperties": true
				}
			},
			sourceLocation: {
				"file": "packages/experimental/media-suite/src/index.ts",
				"line": 603,
				"column": 3
			}
		},
		"mediaSuite/loginState": {
			service: "mediaSuite",
			description: "Last detected login state of a browser profile.",
			invocation: { kind: "direct" },
			parameters: [{
				name: "platform",
				description: "platform id.",
				source: "json",
				codec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaPlatformId",
					create: dsh_media_mediaSuite_loginState_parameter_0$schema,
					jsonSchema: { "type": "string" }
				},
				strictCodec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaPlatformId",
					create: dsh_media_mediaSuite_loginState_parameter_0_strict$schema,
					jsonSchema: { "type": "string" }
				}
			}, {
				name: "account",
				description: "account whose profile is asked about; without it, the platform's shared profile.",
				source: "json",
				acceptsUndefined: true,
				codec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaAccountId",
					create: dsh_media_mediaSuite_loginState_parameter_1$schema,
					jsonSchema: { "type": "string" }
				},
				strictCodec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaAccountId",
					create: dsh_media_mediaSuite_loginState_parameter_1_strict$schema,
					jsonSchema: { "type": "string" }
				}
			}],
			result: {
				mode: "strict",
				typeSymbol: "dsh-media/types#MediaLoginState",
				create: dsh_media_mediaSuite_loginState_result$schema,
				description: "the state, or `unknown` when never detected.",
				jsonSchema: {
					"type": "string",
					"enum": [
						"unknown",
						"logged-in",
						"logged-out"
					]
				}
			},
			sourceLocation: {
				"file": "packages/experimental/media-suite/src/index.ts",
				"line": 1422,
				"column": 3
			}
		},
		"mediaSuite/markDraftPublished": {
			service: "mediaSuite",
			description: "Record where a draft was published, or clear it.",
			invocation: { kind: "direct" },
			parameters: [{
				name: "id",
				description: "draft id.",
				source: "json",
				codec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaDraftId",
					create: dsh_media_mediaSuite_markDraftPublished_parameter_0$schema,
					jsonSchema: { "type": "string" }
				},
				strictCodec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaDraftId",
					create: dsh_media_mediaSuite_markDraftPublished_parameter_0_strict$schema,
					jsonSchema: { "type": "string" }
				}
			}, {
				name: "url",
				description: "address of the published post; empty marks the draft unpublished again.",
				source: "json",
				codec: {
					mode: "strict",
					typeSymbol: "dsh-media#mediaSuite/markDraftPublished:url",
					create: dsh_media_mediaSuite_markDraftPublished_parameter_1$schema,
					jsonSchema: { "type": "string" }
				},
				strictCodec: {
					mode: "strict",
					typeSymbol: "dsh-media#mediaSuite/markDraftPublished:url",
					create: dsh_media_mediaSuite_markDraftPublished_parameter_1_strict$schema,
					jsonSchema: { "type": "string" }
				}
			}],
			result: {
				mode: "strict",
				typeSymbol: "dsh-media/types#MediaDraft",
				create: dsh_media_mediaSuite_markDraftPublished_result$schema,
				description: "the updated draft.",
				jsonSchema: {
					"type": "object",
					"properties": {
						"id": { "type": "string" },
						"createdAt": { "type": "string" },
						"publishedUrl": {
							"type": "string",
							"description": "Address of the published post; its counters come from the fetched posts with the same address."
						},
						"publishedAt": { "type": "string" },
						"demo": {
							"type": "boolean",
							"const": true,
							"description": "Set on drafts `loadDemo` creates."
						},
						"source": {
							"type": "string",
							"description": "Name of the tool that made it, shown beside the title, such as 宣传片工坊."
						},
						"kind": {
							"type": "string",
							"enum": [
								"video",
								"article",
								"card"
							]
						},
						"title": { "type": "string" },
						"file": {
							"type": "string",
							"description": "Absolute path of the finished file, when there is one."
						},
						"folder": {
							"type": "string",
							"description": "Absolute path of the folder that holds the work."
						},
						"note": {
							"type": "string",
							"description": "One line about the content, such as its ratio and length."
						},
						"studioProject": {
							"type": "string",
							"description": "Creation-workbench project id of an article or card set."
						}
					},
					"required": [
						"id",
						"createdAt",
						"source",
						"kind",
						"title"
					],
					"additionalProperties": true
				}
			},
			sourceLocation: {
				"file": "packages/experimental/media-suite/src/index.ts",
				"line": 562,
				"column": 3
			}
		},
		"mediaSuite/network": {
			service: "mediaSuite",
			description: "The 总览 page over a window: every own account's counters, the 全网 totals (plain sums), works published on several platforms, and the newest posts of every account.",
			invocation: { kind: "direct" },
			parameters: [{
				name: "days",
				description: "window length, 1 to 90 days, each account's ending on its platform's last reported day.",
				source: "json",
				codec: {
					mode: "strict",
					typeSymbol: "dsh-media#mediaSuite/network:days",
					create: dsh_media_mediaSuite_network_parameter_0$schema,
					jsonSchema: { "type": "number" }
				},
				strictCodec: {
					mode: "strict",
					typeSymbol: "dsh-media#mediaSuite/network:days",
					create: dsh_media_mediaSuite_network_parameter_0_strict$schema,
					jsonSchema: { "type": "number" }
				}
			}],
			result: {
				mode: "strict",
				typeSymbol: "dsh-media/types#MediaNetwork",
				create: dsh_media_mediaSuite_network_result$schema,
				description: "the network.",
				jsonSchemaError: "typert tool schema: selected dictionaries require string keys and unconstrained JSON values"
			},
			sourceLocation: {
				"file": "packages/experimental/media-suite/src/index.ts",
				"line": 735,
				"column": 3
			}
		},
		"mediaSuite/overview": {
			service: "mediaSuite",
			description: "Dashboard summary of one account.",
			invocation: { kind: "direct" },
			parameters: [{
				name: "id",
				description: "account id.",
				source: "json",
				codec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaAccountId",
					create: dsh_media_mediaSuite_overview_parameter_0$schema,
					jsonSchema: { "type": "string" }
				},
				strictCodec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaAccountId",
					create: dsh_media_mediaSuite_overview_parameter_0_strict$schema,
					jsonSchema: { "type": "string" }
				}
			}, {
				name: "days",
				description: "window in days, clamped to 1..365.",
				source: "json",
				codec: {
					mode: "strict",
					typeSymbol: "dsh-media#mediaSuite/overview:days",
					create: dsh_media_mediaSuite_overview_parameter_1$schema,
					jsonSchema: { "type": "number" }
				},
				strictCodec: {
					mode: "strict",
					typeSymbol: "dsh-media#mediaSuite/overview:days",
					create: dsh_media_mediaSuite_overview_parameter_1_strict$schema,
					jsonSchema: { "type": "number" }
				}
			}],
			result: {
				mode: "strict",
				typeSymbol: "dsh-media/types#MediaAccountOverview",
				create: dsh_media_mediaSuite_overview_result$schema,
				description: "counters, series, deltas, engagement, last run, login state and next scheduled scrape.",
				jsonSchemaError: "typert tool schema: selected dictionaries require string keys and unconstrained JSON values"
			},
			sourceLocation: {
				"file": "packages/experimental/media-suite/src/index.ts",
				"line": 638,
				"column": 3
			}
		},
		"mediaSuite/platforms": {
			service: "mediaSuite",
			description: "List registered platforms.",
			invocation: { kind: "direct" },
			parameters: [],
			result: {
				mode: "strict",
				typeSymbol: "dsh-media#mediaSuite/platforms:result",
				create: dsh_media_mediaSuite_platforms_result$schema,
				description: "descriptors in registration order.",
				jsonSchema: {
					"type": "array",
					"items": {
						"type": "object",
						"properties": {
							"search": {
								"type": "boolean",
								"description": "Whether the platform can search posts, filled in by the registry from the adapter; adapters omit it."
							},
							"id": { "type": "string" },
							"displayName": {
								"type": "string",
								"description": "Display name in the platform's own language, such as `小红书`."
							},
							"loginUrl": {
								"type": "string",
								"description": "Home page the embedded browser opens for login."
							},
							"scrape": {
								"type": "boolean",
								"description": "Whether the adapter scrapes through the embedded browser."
							},
							"import": {
								"type": "boolean",
								"description": "Whether the adapter maps creator-backend export files."
							},
							"importHint": {
								"type": "string",
								"description": "Short hint describing which export file the user should upload."
							},
							"profileUrlExample": {
								"type": "string",
								"description": "Example profile URL shown as the input placeholder."
							},
							"metrics": {
								"type": "object",
								"properties": {
									"views": { "type": "string" },
									"likes": { "type": "string" },
									"comments": { "type": "string" },
									"shares": { "type": "string" },
									"collects": { "type": "string" }
								},
								"required": [],
								"additionalProperties": true,
								"description": "The platform's own names for the post counters, such as `阅读` for a 公众号's `views`. Counters the platform does not report are left out, so the page and the tools never show a counter that is always empty."
							},
							"noun": {
								"type": "string",
								"description": "What one post is called on the platform, such as `视频`, `笔记` or `文章`."
							},
							"color": {
								"type": "string",
								"description": "Brand color (CSS), for the platform's tints and its series in charts; a platform added later brings its own."
							},
							"beta": {
								"type": "boolean",
								"enum": [false, true],
								"description": "Set while the adapter has not been checked against a real logged-in account; the page marks the platform as a trial."
							}
						},
						"required": [
							"id",
							"displayName",
							"loginUrl",
							"scrape",
							"import",
							"importHint",
							"profileUrlExample"
						],
						"additionalProperties": true
					}
				}
			},
			sourceLocation: {
				"file": "packages/experimental/media-suite/src/index.ts",
				"line": 406,
				"column": 3
			}
		},
		"mediaSuite/postDetail": {
			service: "mediaSuite",
			description: "Detail of one post: the platform's counters, rates and how they compare with the account's other posts.",
			invocation: { kind: "direct" },
			parameters: [{
				name: "id",
				description: "account id.",
				source: "json",
				codec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaAccountId",
					create: dsh_media_mediaSuite_postDetail_parameter_0$schema,
					jsonSchema: { "type": "string" }
				},
				strictCodec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaAccountId",
					create: dsh_media_mediaSuite_postDetail_parameter_0_strict$schema,
					jsonSchema: { "type": "string" }
				}
			}, {
				name: "postId",
				description: "platform post id.",
				source: "json",
				codec: {
					mode: "strict",
					typeSymbol: "dsh-media#mediaSuite/postDetail:postId",
					create: dsh_media_mediaSuite_postDetail_parameter_1$schema,
					jsonSchema: { "type": "string" }
				},
				strictCodec: {
					mode: "strict",
					typeSymbol: "dsh-media#mediaSuite/postDetail:postId",
					create: dsh_media_mediaSuite_postDetail_parameter_1_strict$schema,
					jsonSchema: { "type": "string" }
				}
			}],
			result: {
				mode: "strict",
				typeSymbol: "dsh-media/types#MediaPostDetail",
				create: dsh_media_mediaSuite_postDetail_result$schema,
				description: "the detail.",
				jsonSchemaError: "typert tool schema: selected dictionaries require string keys and unconstrained JSON values"
			},
			sourceLocation: {
				"file": "packages/experimental/media-suite/src/index.ts",
				"line": 863,
				"column": 3
			}
		},
		"mediaSuite/posts": {
			service: "mediaSuite",
			description: "Newest posts of one account.",
			invocation: { kind: "direct" },
			parameters: [{
				name: "id",
				description: "account id.",
				source: "json",
				codec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaAccountId",
					create: dsh_media_mediaSuite_posts_parameter_0$schema,
					jsonSchema: { "type": "string" }
				},
				strictCodec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaAccountId",
					create: dsh_media_mediaSuite_posts_parameter_0_strict$schema,
					jsonSchema: { "type": "string" }
				}
			}, {
				name: "limit",
				description: "maximum posts, clamped to 1..500.",
				source: "json",
				codec: {
					mode: "strict",
					typeSymbol: "dsh-media#mediaSuite/posts:limit",
					create: dsh_media_mediaSuite_posts_parameter_1$schema,
					jsonSchema: { "type": "number" }
				},
				strictCodec: {
					mode: "strict",
					typeSymbol: "dsh-media#mediaSuite/posts:limit",
					create: dsh_media_mediaSuite_posts_parameter_1_strict$schema,
					jsonSchema: { "type": "number" }
				}
			}],
			result: {
				mode: "strict",
				typeSymbol: "dsh-media#mediaSuite/posts:result",
				create: dsh_media_mediaSuite_posts_result$schema,
				description: "posts, newest first.",
				jsonSchemaError: "typert tool schema: selected dictionaries require string keys and unconstrained JSON values"
			},
			sourceLocation: {
				"file": "packages/experimental/media-suite/src/index.ts",
				"line": 664,
				"column": 3
			}
		},
		"mediaSuite/refresh": {
			service: "mediaSuite",
			description: "Scrape one account now through the platform's headless browser. The run is recorded even when it fails.",
			invocation: { kind: "direct" },
			parameters: [{
				name: "id",
				description: "account id.",
				source: "json",
				codec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaAccountId",
					create: dsh_media_mediaSuite_refresh_parameter_0$schema,
					jsonSchema: { "type": "string" }
				},
				strictCodec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaAccountId",
					create: dsh_media_mediaSuite_refresh_parameter_0_strict$schema,
					jsonSchema: { "type": "string" }
				}
			}],
			cancellation: { parameter: "signal" },
			result: {
				mode: "strict",
				typeSymbol: "dsh-media/types#MediaRunRecord",
				create: dsh_media_mediaSuite_refresh_result$schema,
				description: "the recorded run; failures carry `ok: false` and an error code.",
				jsonSchema: {
					"type": "object",
					"properties": {
						"accountId": { "type": "string" },
						"kind": {
							"type": "string",
							"enum": ["scrape", "import"]
						},
						"startedAt": {
							"type": "string",
							"description": "ISO-8601 instants."
						},
						"finishedAt": { "type": "string" },
						"ok": { "type": "boolean" },
						"errorCode": {
							"type": "string",
							"description": "Localizable failure code, such as `login-required` or `parse-failed`."
						},
						"message": { "type": "string" },
						"postsWritten": { "type": "number" }
					},
					"required": [
						"accountId",
						"kind",
						"startedAt",
						"finishedAt",
						"ok",
						"postsWritten"
					],
					"additionalProperties": true
				}
			},
			sourceLocation: {
				"file": "packages/experimental/media-suite/src/index.ts",
				"line": 878,
				"column": 9
			}
		},
		"mediaSuite/removeDraft": {
			service: "mediaSuite",
			description: "Remove a draft from the list; its files stay where they are.",
			invocation: { kind: "direct" },
			parameters: [{
				name: "id",
				description: "draft id.",
				source: "json",
				codec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaDraftId",
					create: dsh_media_mediaSuite_removeDraft_parameter_0$schema,
					jsonSchema: { "type": "string" }
				},
				strictCodec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaDraftId",
					create: dsh_media_mediaSuite_removeDraft_parameter_0_strict$schema,
					jsonSchema: { "type": "string" }
				}
			}],
			result: {
				mode: "strict",
				typeSymbol: "dsh-media#mediaSuite/removeDraft:result",
				create: dsh_media_mediaSuite_removeDraft_result$schema,
				jsonSchemaError: "typert tool schema: unsupported void value"
			},
			sourceLocation: {
				"file": "packages/experimental/media-suite/src/index.ts",
				"line": 579,
				"column": 3
			}
		},
		"mediaSuite/revealDraft": {
			service: "mediaSuite",
			description: "Show a draft's file, or its folder, in the system file manager on the Host computer.",
			invocation: { kind: "direct" },
			parameters: [{
				name: "id",
				description: "draft id.",
				source: "json",
				codec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaDraftId",
					create: dsh_media_mediaSuite_revealDraft_parameter_0$schema,
					jsonSchema: { "type": "string" }
				},
				strictCodec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaDraftId",
					create: dsh_media_mediaSuite_revealDraft_parameter_0_strict$schema,
					jsonSchema: { "type": "string" }
				}
			}],
			result: {
				mode: "strict",
				typeSymbol: "dsh-media#mediaSuite/revealDraft:result",
				create: dsh_media_mediaSuite_revealDraft_result$schema,
				jsonSchemaError: "typert tool schema: unsupported void value"
			},
			sourceLocation: {
				"file": "packages/experimental/media-suite/src/index.ts",
				"line": 588,
				"column": 3
			}
		},
		"mediaSuite/saveAccount": {
			service: "mediaSuite",
			description: "Create or update an account.",
			invocation: { kind: "direct" },
			parameters: [{
				name: "draft",
				description: "editable fields; omitting `id` creates an account.",
				source: "json",
				codec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaAccountDraft",
					create: dsh_media_mediaSuite_saveAccount_parameter_0$schema,
					jsonSchema: {
						"type": "object",
						"properties": {
							"id": { "type": "string" },
							"platform": { "type": "string" },
							"role": {
								"type": "string",
								"enum": ["own", "benchmark"]
							},
							"name": {
								"type": "string",
								"description": "Display name chosen by the user."
							},
							"profileUrl": {
								"type": "string",
								"description": "Public profile URL used by scraping."
							},
							"niche": {
								"type": "string",
								"description": "Content field, such as `职场成长` or `美食探店`, used by AI prompts."
							},
							"notes": {
								"type": "string",
								"description": "Free-form notes for AI prompts: audience, style, goals."
							},
							"monitor": {
								"type": "object",
								"properties": {
									"enabled": { "type": "boolean" },
									"intervalMinutes": {
										"type": "number",
										"description": "Minutes between automatic scrapes; the Host clamps to its configured minimum."
									}
								},
								"required": ["enabled", "intervalMinutes"],
								"additionalProperties": true
							},
							"avatarUrl": {
								"type": "string",
								"description": "The account's avatar image on the platform (an https URL), read when scanning in and refreshed by each update."
							}
						},
						"required": [
							"platform",
							"role",
							"name",
							"profileUrl",
							"niche",
							"notes",
							"monitor"
						],
						"additionalProperties": true
					}
				},
				strictCodec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaAccountDraft",
					create: dsh_media_mediaSuite_saveAccount_parameter_0_strict$schema,
					jsonSchema: {
						"type": "object",
						"properties": {
							"id": { "type": "string" },
							"platform": { "type": "string" },
							"role": {
								"type": "string",
								"enum": ["own", "benchmark"]
							},
							"name": {
								"type": "string",
								"description": "Display name chosen by the user."
							},
							"profileUrl": {
								"type": "string",
								"description": "Public profile URL used by scraping."
							},
							"niche": {
								"type": "string",
								"description": "Content field, such as `职场成长` or `美食探店`, used by AI prompts."
							},
							"notes": {
								"type": "string",
								"description": "Free-form notes for AI prompts: audience, style, goals."
							},
							"monitor": {
								"type": "object",
								"properties": {
									"enabled": { "type": "boolean" },
									"intervalMinutes": {
										"type": "number",
										"description": "Minutes between automatic scrapes; the Host clamps to its configured minimum."
									}
								},
								"required": ["enabled", "intervalMinutes"],
								"additionalProperties": false
							},
							"avatarUrl": {
								"type": "string",
								"description": "The account's avatar image on the platform (an https URL), read when scanning in and refreshed by each update."
							}
						},
						"required": [
							"platform",
							"role",
							"name",
							"profileUrl",
							"niche",
							"notes",
							"monitor"
						],
						"additionalProperties": false
					}
				}
			}, {
				name: "view",
				description: "embedded view the own account was scanned in; the account then keeps its login in that view's browser profile, and an account profile it used before is deleted.",
				source: "json",
				acceptsUndefined: true,
				codec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaBrowserId",
					create: dsh_media_mediaSuite_saveAccount_parameter_1$schema,
					jsonSchema: { "type": "string" }
				},
				strictCodec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaBrowserId",
					create: dsh_media_mediaSuite_saveAccount_parameter_1_strict$schema,
					jsonSchema: { "type": "string" }
				}
			}],
			result: {
				mode: "strict",
				typeSymbol: "dsh-media/types#MediaAccount",
				create: dsh_media_mediaSuite_saveAccount_result$schema,
				description: "the stored account.",
				jsonSchema: {
					"type": "object",
					"properties": {
						"id": { "type": "string" },
						"demo": {
							"type": "boolean",
							"const": true,
							"description": "Set on the sample accounts `loadDemo` creates; they hold made-up data and are never fetched."
						},
						"loginProfile": {
							"type": "string",
							"description": "Browser profile that keeps this own account's login, set when the account is connected by scanning. Without it the account uses the platform's shared profile, which holds one login at a time."
						},
						"createdAt": {
							"type": "string",
							"description": "ISO-8601 instants."
						},
						"updatedAt": { "type": "string" },
						"platform": { "type": "string" },
						"role": {
							"type": "string",
							"enum": ["own", "benchmark"]
						},
						"name": {
							"type": "string",
							"description": "Display name chosen by the user."
						},
						"profileUrl": {
							"type": "string",
							"description": "Public profile URL used by scraping."
						},
						"niche": {
							"type": "string",
							"description": "Content field, such as `职场成长` or `美食探店`, used by AI prompts."
						},
						"notes": {
							"type": "string",
							"description": "Free-form notes for AI prompts: audience, style, goals."
						},
						"monitor": {
							"type": "object",
							"properties": {
								"enabled": { "type": "boolean" },
								"intervalMinutes": {
									"type": "number",
									"description": "Minutes between automatic scrapes; the Host clamps to its configured minimum."
								}
							},
							"required": ["enabled", "intervalMinutes"],
							"additionalProperties": true
						},
						"avatarUrl": {
							"type": "string",
							"description": "The account's avatar image on the platform (an https URL), read when scanning in and refreshed by each update."
						}
					},
					"required": [
						"id",
						"createdAt",
						"updatedAt",
						"platform",
						"role",
						"name",
						"profileUrl",
						"niche",
						"notes",
						"monitor"
					],
					"additionalProperties": true
				}
			},
			sourceLocation: {
				"file": "packages/experimental/media-suite/src/index.ts",
				"line": 428,
				"column": 3
			}
		},
		"mediaSuite/startBrief": {
			service: "mediaSuite",
			description: "Start writing a 今日简报 now, unless one is being written; the page polls {@link MediaSuite.brief} for its lines.",
			invocation: { kind: "direct" },
			parameters: [],
			result: {
				mode: "strict",
				typeSymbol: "dsh-media/types#MediaBriefState",
				create: dsh_media_mediaSuite_startBrief_result$schema,
				description: "the state right after starting.",
				jsonSchema: {
					"type": "object",
					"properties": {
						"brief": {
							"type": "object",
							"properties": {
								"id": { "type": "string" },
								"day": {
									"type": "string",
									"description": "China day the brief is for."
								},
								"createdAt": { "type": "string" },
								"model": {
									"type": "string",
									"description": "`provider/model` that wrote it."
								},
								"dataAt": {
									"type": "string",
									"description": "Newest capture the brief saw."
								},
								"items": {
									"type": "array",
									"items": {
										"type": "object",
										"properties": {
											"kind": {
												"type": "string",
												"enum": [
													"alert",
													"fact",
													"action",
													"topic"
												]
											},
											"text": { "type": "string" },
											"accountId": {
												"type": "string",
												"description": "The account the line is about, when it names one of the user's accounts."
											},
											"platform": {
												"type": "string",
												"description": "Platform name the line is about, as the model wrote it."
											},
											"detail": {
												"type": "string",
												"description": "The longer explanation shown when the line is opened: the numbers behind it and what to do."
											},
											"post": {
												"type": "object",
												"properties": {
													"accountId": { "type": "string" },
													"postId": { "type": "string" }
												},
												"required": ["accountId", "postId"],
												"additionalProperties": true,
												"description": "The work the line is about, when its title matches one of the recent posts."
											},
											"metric": {
												"type": "string",
												"enum": [
													"followers",
													"fansNet",
													"views",
													"likes",
													"comments",
													"shares",
													"posts"
												],
												"description": "The 全网 counter the line is about, so the page can show its numbers."
											}
										},
										"required": ["kind", "text"],
										"additionalProperties": true
									}
								}
							},
							"required": [
								"id",
								"day",
								"createdAt",
								"model",
								"items"
							],
							"additionalProperties": true
						},
						"running": {
							"type": "boolean",
							"description": "A brief is being written now; `partial` holds its finished lines."
						},
						"partial": {
							"type": "array",
							"items": {
								"type": "object",
								"properties": {
									"kind": {
										"type": "string",
										"enum": [
											"alert",
											"fact",
											"action",
											"topic"
										]
									},
									"text": { "type": "string" },
									"accountId": {
										"type": "string",
										"description": "The account the line is about, when it names one of the user's accounts."
									},
									"platform": {
										"type": "string",
										"description": "Platform name the line is about, as the model wrote it."
									},
									"detail": {
										"type": "string",
										"description": "The longer explanation shown when the line is opened: the numbers behind it and what to do."
									},
									"post": {
										"type": "object",
										"properties": {
											"accountId": { "type": "string" },
											"postId": { "type": "string" }
										},
										"required": ["accountId", "postId"],
										"additionalProperties": true,
										"description": "The work the line is about, when its title matches one of the recent posts."
									},
									"metric": {
										"type": "string",
										"enum": [
											"followers",
											"fansNet",
											"views",
											"likes",
											"comments",
											"shares",
											"posts"
										],
										"description": "The 全网 counter the line is about, so the page can show its numbers."
									}
								},
								"required": ["kind", "text"],
								"additionalProperties": true
							}
						},
						"problem": {
							"type": "string",
							"description": "Why the last attempt failed, until the next one starts."
						},
						"scheduleAt": {
							"type": "string",
							"description": "China time the daily brief is written at, such as `09:00`."
						}
					},
					"required": [
						"running",
						"partial",
						"scheduleAt"
					],
					"additionalProperties": true
				}
			},
			sourceLocation: {
				"file": "packages/experimental/media-suite/src/index.ts",
				"line": 778,
				"column": 3
			}
		},
		"mediaSuite/studioOpen": {
			service: "mediaSuite",
			description: "Start the creation workbench unless it runs, and return its page URL.",
			invocation: { kind: "direct" },
			parameters: [],
			cancellation: { parameter: "signal" },
			result: {
				mode: "strict",
				typeSymbol: "dsh-media#mediaSuite/studioOpen:result",
				create: dsh_media_mediaSuite_studioOpen_result$schema,
				description: "the URL, or undefined when no workbench folder is configured.",
				jsonSchemaError: "typert tool schema: unsupported undefined value"
			},
			sourceLocation: {
				"file": "packages/experimental/media-suite/src/index.ts",
				"line": 1270,
				"column": 9
			}
		},
		"mediaSuite/studioWriteArticle": {
			service: "mediaSuite",
			description: "Create a project in the creation workbench from one suggestion of a stored topic report: a video script for a video topic, whose skeleton is filled from the topic's filming plan, and an article otherwise. The topic's angle, reasoning, headlines, keywords, references and related posts become the project's research notes.",
			invocation: { kind: "direct" },
			parameters: [{
				name: "id",
				description: "report id.",
				source: "json",
				codec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaReportId",
					create: dsh_media_mediaSuite_studioWriteArticle_parameter_0$schema,
					jsonSchema: { "type": "string" }
				},
				strictCodec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaReportId",
					create: dsh_media_mediaSuite_studioWriteArticle_parameter_0_strict$schema,
					jsonSchema: { "type": "string" }
				}
			}, {
				name: "index",
				description: "suggestion index in the report.",
				source: "json",
				codec: {
					mode: "strict",
					typeSymbol: "dsh-media#mediaSuite/studioWriteArticle:index",
					create: dsh_media_mediaSuite_studioWriteArticle_parameter_1$schema,
					jsonSchema: { "type": "number" }
				},
				strictCodec: {
					mode: "strict",
					typeSymbol: "dsh-media#mediaSuite/studioWriteArticle:index",
					create: dsh_media_mediaSuite_studioWriteArticle_parameter_1_strict$schema,
					jsonSchema: { "type": "number" }
				}
			}],
			cancellation: { parameter: "signal" },
			result: {
				mode: "strict",
				typeSymbol: "dsh-media#mediaSuite/studioWriteArticle:result",
				create: dsh_media_mediaSuite_studioWriteArticle_result$schema,
				description: "the workbench URL that opens the new article's research step or the new script's writing step.",
				jsonSchema: { "type": "string" }
			},
			sourceLocation: {
				"file": "packages/experimental/media-suite/src/index.ts",
				"line": 1292,
				"column": 9
			}
		},
		"mediaSuite/summary": {
			service: "mediaSuite",
			description: "The 总览 page: every own account with its health and 7-day headline counters, and the newest posts across them.",
			invocation: { kind: "direct" },
			parameters: [],
			result: {
				mode: "strict",
				typeSymbol: "dsh-media/types#MediaSummary",
				create: dsh_media_mediaSuite_summary_result$schema,
				description: "own accounts in creation order and up to twelve newest posts.",
				jsonSchemaError: "typert tool schema: selected dictionaries require string keys and unconstrained JSON values"
			},
			sourceLocation: {
				"file": "packages/experimental/media-suite/src/index.ts",
				"line": 712,
				"column": 3
			}
		},
		"mediaSuite/topicReports": {
			service: "mediaSuite",
			description: "List stored topic reports.",
			invocation: { kind: "direct" },
			parameters: [{
				name: "id",
				description: "account id.",
				source: "json",
				codec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaAccountId",
					create: dsh_media_mediaSuite_topicReports_parameter_0$schema,
					jsonSchema: { "type": "string" }
				},
				strictCodec: {
					mode: "strict",
					typeSymbol: "dsh-media/types#MediaAccountId",
					create: dsh_media_mediaSuite_topicReports_parameter_0_strict$schema,
					jsonSchema: { "type": "string" }
				}
			}],
			result: {
				mode: "strict",
				typeSymbol: "dsh-media#mediaSuite/topicReports:result",
				create: dsh_media_mediaSuite_topicReports_result$schema,
				description: "reports, newest first.",
				jsonSchema: {
					"type": "array",
					"items": {
						"type": "object",
						"properties": {
							"id": { "type": "string" },
							"accountId": { "type": "string" },
							"createdAt": { "type": "string" },
							"model": {
								"type": "string",
								"description": "`provider/model` that generated the report."
							},
							"summary": { "type": "string" },
							"suggestions": {
								"type": "array",
								"items": {
									"type": "object",
									"properties": {
										"title": { "type": "string" },
										"angle": {
											"type": "string",
											"description": "Angle or hook that differentiates the topic."
										},
										"reason": {
											"type": "string",
											"description": "Why the topic suits this account, citing data."
										},
										"format": {
											"type": "string",
											"enum": [
												"image",
												"other",
												"video",
												"article"
											]
										},
										"headlines": {
											"type": "array",
											"items": { "type": "string" },
											"description": "Candidate post titles."
										},
										"references": {
											"type": "array",
											"items": { "type": "string" },
											"description": "Titles of own or benchmark posts that inspired the suggestion."
										},
										"priority": {
											"type": "string",
											"enum": [
												"high",
												"medium",
												"low"
											]
										},
										"keywords": {
											"type": "array",
											"items": { "type": "string" },
											"description": "Short platform search keywords for the topic; empty in reports generated before keywords were requested."
										},
										"related": {
											"type": "array",
											"items": {
												"type": "object",
												"properties": {
													"postId": { "type": "string" },
													"title": { "type": "string" },
													"url": { "type": "string" },
													"author": {
														"type": "string",
														"description": "Author nickname."
													},
													"coverUrl": {
														"type": "string",
														"description": "Cover image URL as the platform served it; platform CDNs sign these URLs, so old ones may stop loading."
													},
													"publishedAt": {
														"type": "string",
														"description": "ISO-8601 publish instant."
													},
													"format": {
														"type": "string",
														"enum": [
															"image",
															"other",
															"video",
															"article"
														]
													},
													"views": { "type": "number" },
													"likes": { "type": "number" },
													"comments": { "type": "number" },
													"collects": { "type": "number" },
													"shares": { "type": "number" }
												},
												"required": [
													"postId",
													"title",
													"url",
													"author",
													"format"
												],
												"additionalProperties": true
											},
											"description": "Popular platform posts found by searching the keywords, most liked first; empty when search was unavailable."
										},
										"video": {
											"type": "object",
											"properties": {
												"hook": {
													"type": "string",
													"description": "The first line spoken, written to hold the viewer through the first three seconds."
												},
												"outline": {
													"type": "array",
													"items": { "type": "string" },
													"description": "Talking points in order, one per segment of the script."
												},
												"seconds": {
													"type": "number",
													"description": "Suggested length in seconds; 0 when the model gave none."
												},
												"cover": {
													"type": "string",
													"description": "Text for the cover image."
												}
											},
											"required": [
												"hook",
												"outline",
												"seconds",
												"cover"
											],
											"additionalProperties": true,
											"description": "Filming plan of a video topic; absent for other formats and in reports generated before the plan was requested."
										}
									},
									"required": [
										"title",
										"angle",
										"reason",
										"format",
										"headlines",
										"references",
										"priority",
										"keywords",
										"related"
									],
									"additionalProperties": true
								}
							},
							"research": {
								"type": "object",
								"properties": {
									"searches": {
										"type": "array",
										"items": {
											"type": "object",
											"properties": {
												"keyword": { "type": "string" },
												"posts": {
													"type": "array",
													"items": {
														"type": "object",
														"properties": {
															"postId": { "type": "string" },
															"title": { "type": "string" },
															"url": { "type": "string" },
															"author": {
																"type": "string",
																"description": "Author nickname."
															},
															"coverUrl": {
																"type": "string",
																"description": "Cover image URL as the platform served it; platform CDNs sign these URLs, so old ones may stop loading."
															},
															"publishedAt": {
																"type": "string",
																"description": "ISO-8601 publish instant."
															},
															"format": {
																"type": "string",
																"enum": [
																	"image",
																	"other",
																	"video",
																	"article"
																]
															},
															"views": { "type": "number" },
															"likes": { "type": "number" },
															"comments": { "type": "number" },
															"collects": { "type": "number" },
															"shares": { "type": "number" }
														},
														"required": [
															"postId",
															"title",
															"url",
															"author",
															"format"
														],
														"additionalProperties": true
													}
												}
											},
											"required": ["keyword", "posts"],
											"additionalProperties": true
										},
										"description": "Platform searches for the account's own keywords."
									},
									"trending": {
										"type": "array",
										"items": {
											"type": "object",
											"properties": {
												"word": { "type": "string" },
												"heat": {
													"type": "number",
													"description": "Platform heat score, where reported."
												}
											},
											"required": ["word"],
											"additionalProperties": true
										}
									},
									"news": {
										"type": "array",
										"items": {
											"type": "object",
											"properties": {
												"title": { "type": "string" },
												"url": { "type": "string" },
												"snippet": { "type": "string" },
												"publishedAt": {
													"type": "string",
													"description": "ISO-8601 or platform-formatted publish date, where reported."
												}
											},
											"required": [
												"title",
												"url",
												"snippet"
											],
											"additionalProperties": true
										}
									},
									"benchmarksRefreshed": {
										"type": "number",
										"description": "Benchmark accounts whose data was refreshed for this report."
									},
									"notes": {
										"type": "array",
										"items": { "type": "string" },
										"description": "Sources that were skipped or failed, in Chinese."
									}
								},
								"required": [
									"searches",
									"trending",
									"news",
									"benchmarksRefreshed",
									"notes"
								],
								"additionalProperties": true,
								"description": "Material gathered before generation; absent in reports generated before research existed."
							},
							"direction": {
								"type": "string",
								"description": "What the user asked this report to be about; absent when no direction was given."
							}
						},
						"required": [
							"id",
							"accountId",
							"createdAt",
							"model",
							"summary",
							"suggestions"
						],
						"additionalProperties": true
					}
				}
			},
			sourceLocation: {
				"file": "packages/experimental/media-suite/src/index.ts",
				"line": 1318,
				"column": 3
			}
		},
		"mediaSuite/uiSettings": {
			service: "mediaSuite",
			description: "Read the page settings file again; the page asks each time it opens.",
			invocation: { kind: "direct" },
			parameters: [],
			result: {
				mode: "strict",
				typeSymbol: "dsh-media/types#MediaUiSettings",
				create: dsh_media_mediaSuite_uiSettings_result$schema,
				description: "the settings, with what could not be understood.",
				jsonSchema: {
					"type": "object",
					"properties": {
						"title": { "type": "string" },
						"accent": {
							"type": "string",
							"description": "Accent color as `#rgb` or `#rrggbb`."
						},
						"labels": {
							"type": "object",
							"properties": {
								"today": { "type": "string" },
								"topics": { "type": "string" },
								"studio": { "type": "string" },
								"data": { "type": "string" },
								"accounts": { "type": "string" }
							},
							"required": [],
							"additionalProperties": true,
							"description": "Navigation names by view."
						},
						"hidden": {
							"type": "array",
							"items": {
								"type": "string",
								"enum": [
									"today",
									"topics",
									"studio",
									"data",
									"accounts"
								]
							},
							"description": "Views left out of the navigation; 今天 is never hidden."
						},
						"today": {
							"type": "array",
							"items": {
								"type": "string",
								"enum": [
									"ready",
									"own",
									"todo",
									"numbers",
									"drafts",
									"peers"
								]
							},
							"description": "今天 panels in the order shown; panels left out are hidden. Undefined keeps the built-in order."
						},
						"css": {
							"type": "string",
							"description": "Free-form styles applied to the page."
						},
						"problems": {
							"type": "array",
							"items": { "type": "string" },
							"description": "What could not be understood, in Chinese."
						},
						"file": {
							"type": "string",
							"description": "The settings file, when one is configured."
						},
						"writing": {
							"type": "boolean",
							"enum": [false, true],
							"description": "Whether a creation workbench is configured; without one the page leaves out 写作 and its actions."
						}
					},
					"required": [
						"labels",
						"hidden",
						"css",
						"problems"
					],
					"additionalProperties": true
				}
			},
			sourceLocation: {
				"file": "packages/experimental/media-suite/src/index.ts",
				"line": 520,
				"column": 3
			}
		}
	}
}, external_exports);
const TYPERT = {
	package: "dsh-media",
	face: "host",
	schemas: [],
	get invocations() {
		return $remote.descriptors;
	},
	model: {
		"services": [{
			"description": "Media suite controller: `ctx.mediaSuite` on the Host and `ctx.remote.mediaSuite` on the Client.",
			"summary": "Media suite controller: `ctx.mediaSuite` on the Host and `ctx.remote.mediaSuite` on the Client.",
			"tags": [],
			"jsDoc": "/** Media suite controller: `ctx.mediaSuite` on the Host and `ctx.remote.mediaSuite` on the Client. */",
			"key": "mediaSuite",
			"exportName": "MediaSuite",
			"members": [
				{
					"kind": "property",
					"name": "llm",
					"signature": "llm: MediaLlm",
					"summary": "Model call used for reports; tests replace it.",
					"jsDoc": "/** Model call used for reports; tests replace it. */"
				},
				{
					"kind": "method",
					"name": "registerAdapter",
					"signature": "registerAdapter(adapter: MediaPlatformAdapter): () => void",
					"summary": "Register a platform adapter for the caller's lifetime.",
					"jsDoc": "/**\n * Register a platform adapter for the caller's lifetime.\n * @param adapter - adapter with an unused platform id.\n * @returns a disposer removing the adapter.\n * @throws {Error} when the id is malformed or already registered.\n */"
				},
				{
					"kind": "method",
					"name": "platformName",
					"signature": "platformName(platform: MediaPlatformId): string",
					"summary": "Display name of a platform.",
					"jsDoc": "/**\n * Display name of a platform.\n * @param platform - platform id.\n * @returns the display name, or the id when unregistered.\n */"
				},
				{
					"kind": "method",
					"name": "platforms",
					"signature": "@Remote platforms(): MediaPlatformDescriptor[]",
					"summary": "List registered platforms.",
					"jsDoc": "/**\n * List registered platforms.\n * @returns descriptors in registration order.\n */"
				},
				{
					"kind": "method",
					"name": "accounts",
					"signature": "@Remote accounts(): MediaAccount[]",
					"summary": "List configured accounts.",
					"jsDoc": "/**\n * List configured accounts.\n * @returns accounts in creation order.\n */"
				},
				{
					"kind": "method",
					"name": "saveAccount",
					"signature": "@Remote saveAccount(draft: MediaAccountDraft, view?: MediaBrowserId): MediaAccount",
					"summary": "Create or update an account.",
					"jsDoc": "/**\n * Create or update an account.\n * @param draft - editable fields; omitting `id` creates an account.\n * @param view - embedded view the own account was scanned in; the account then keeps its login in that view's\n * browser profile, and an account profile it used before is deleted.\n * @returns the stored account.\n * @throws {RemoteError} `media/invalid` for an unregistered platform or empty name; `media/not-found` for an unknown id.\n */"
				},
				{
					"kind": "method",
					"name": "deleteAccount",
					"signature": "@Remote deleteAccount(id: MediaAccountId): void",
					"summary": "Delete an account with its snapshots, posts, runs and reports.",
					"jsDoc": "/**\n * Delete an account with its snapshots, posts, runs and reports.\n * @param id - account id.\n * @throws {RemoteError} `media/not-found` for an unknown id.\n */"
				},
				{
					"kind": "method",
					"name": "uiSettings",
					"signature": "@Remote uiSettings(): MediaUiSettings",
					"summary": "Read the page settings file again; the page asks each time it opens.",
					"jsDoc": "/**\n * Read the page settings file again; the page asks each time it opens.\n * @returns the settings, with what could not be understood.\n */"
				},
				{
					"kind": "method",
					"name": "addDraft",
					"signature": "addDraft(input: MediaDraftInput): { readonly id: MediaDraftId }",
					"summary": "Hand content to the suite to publish, such as a finished video from another plugin or a new article.",
					"jsDoc": "/**\n * Hand content to the suite to publish, such as a finished video from another plugin or a new article. Other plugins\n * call it through `ctx.get('mediaSuite')`; it is not a Remote method.\n * @param input - the content.\n * @returns the new draft's id.\n * @throws {RemoteError} `media/invalid` for an empty title or a relative path.\n */"
				},
				{
					"kind": "method",
					"name": "drafts",
					"signature": "@Remote drafts(): MediaDraft[]",
					"summary": "List the drafts, newest first.",
					"jsDoc": "/**\n * List the drafts, newest first.\n * @returns drafts waiting to be published and published ones.\n */"
				},
				{
					"kind": "method",
					"name": "markDraftPublished",
					"signature": "@Remote markDraftPublished(id: MediaDraftId, url: string): MediaDraft",
					"summary": "Record where a draft was published, or clear it.",
					"jsDoc": "/**\n * Record where a draft was published, or clear it.\n * @param id - draft id.\n * @param url - address of the published post; empty marks the draft unpublished again.\n * @returns the updated draft.\n */"
				},
				{
					"kind": "method",
					"name": "removeDraft",
					"signature": "@Remote removeDraft(id: MediaDraftId): void",
					"summary": "Remove a draft from the list; its files stay where they are.",
					"jsDoc": "/**\n * Remove a draft from the list; its files stay where they are.\n * @param id - draft id.\n */"
				},
				{
					"kind": "method",
					"name": "revealDraft",
					"signature": "@Remote revealDraft(id: MediaDraftId): void",
					"summary": "Show a draft's file, or its folder, in the system file manager on the Host computer.",
					"jsDoc": "/**\n * Show a draft's file, or its folder, in the system file manager on the Host computer.\n * @param id - draft id.\n */"
				},
				{
					"kind": "method",
					"name": "loadDemo",
					"signature": "@Remote loadDemo(): MediaAccount",
					"summary": "Add the sample accounts, counters, posts, reports and drafts for a demonstration, replacing earlier sample data.",
					"jsDoc": "/**\n * Add the sample accounts, counters, posts, reports and drafts for a demonstration, replacing earlier sample data.\n * @returns the sample own account.\n */"
				},
				{
					"kind": "method",
					"name": "clearDemo",
					"signature": "@Remote clearDemo(): number",
					"summary": "Delete every sample account with its data, and the sample drafts.",
					"jsDoc": "/**\n * Delete every sample account with its data, and the sample drafts.\n * @returns how many sample accounts were deleted.\n */"
				},
				{
					"kind": "method",
					"name": "overview",
					"signature": "@Remote overview(id: MediaAccountId, days: number): MediaAccountOverview",
					"summary": "Dashboard summary of one account.",
					"jsDoc": "/**\n * Dashboard summary of one account.\n * @param id - account id.\n * @param days - window in days, clamped to 1..365.\n * @returns counters, series, deltas, engagement, last run, login state and next scheduled scrape.\n * @throws {RemoteError} `media/not-found` for an unknown id.\n */"
				},
				{
					"kind": "method",
					"name": "posts",
					"signature": "@Remote posts(id: MediaAccountId, limit: number): MediaPost[]",
					"summary": "Newest posts of one account.",
					"jsDoc": "/**\n * Newest posts of one account.\n * @param id - account id.\n * @param limit - maximum posts, clamped to 1..500.\n * @returns posts, newest first.\n * @throws {RemoteError} `media/not-found` for an unknown id.\n */"
				},
				{
					"kind": "method",
					"name": "healthOf",
					"signature": "healthOf(account: MediaAccount, now: number = Date.now()): MediaAccountHealth",
					"summary": "How trustworthy one account's numbers are right now.",
					"jsDoc": "/**\n * How trustworthy one account's numbers are right now.\n * @param account - stored account.\n * @param now - the current moment.\n * @returns the health.\n */"
				},
				{
					"kind": "method",
					"name": "summary",
					"signature": "@Remote summary(): MediaSummary",
					"summary": "The 总览 page: every own account with its health and 7-day headline counters, and the newest posts across them.",
					"jsDoc": "/**\n * The 总览 page: every own account with its health and 7-day headline counters, and the newest posts across them.\n * @returns own accounts in creation order and up to twelve newest posts.\n */"
				},
				{
					"kind": "method",
					"name": "network",
					"signature": "@Remote network(days: number): MediaNetwork",
					"summary": "The 总览 page over a window: every own account's counters, the 全网 totals (plain sums), works published on several platforms, and the newest posts of every account.",
					"jsDoc": "/**\n * The 总览 page over a window: every own account's counters, the 全网 totals (plain sums), works published on several\n * platforms, and the newest posts of every account.\n * @param days - window length, 1 to 90 days, each account's ending on its platform's last reported day.\n * @returns the network.\n */"
				},
				{
					"kind": "method",
					"name": "brief",
					"signature": "@Remote brief(): MediaBriefState",
					"summary": "The 今日简报 as the page polls it: the newest one, and the finished lines of one being written.",
					"jsDoc": "/**\n * The 今日简报 as the page polls it: the newest one, and the finished lines of one being written.\n * @returns the state.\n */"
				},
				{
					"kind": "method",
					"name": "startBrief",
					"signature": "@Remote startBrief(): MediaBriefState",
					"summary": "Start writing a 今日简报 now, unless one is being written; the page polls {@link MediaSuite.brief} for its lines.",
					"jsDoc": "/**\n * Start writing a 今日简报 now, unless one is being written; the page polls {@link MediaSuite.brief} for its lines.\n * @returns the state right after starting.\n * @throws {RemoteError} `media/invalid` without accounts.\n */"
				},
				{
					"kind": "method",
					"name": "dashboard",
					"signature": "@Remote dashboard(id: MediaAccountId, days: number): MediaDashboard",
					"summary": "Everything the dashboard of one account shows.",
					"jsDoc": "/**\n * Everything the dashboard of one account shows.\n * @param id - account id.\n * @param days - window in whole days ending yesterday, clamped to 1..90.\n * @returns health, the 7-day headline, the works and fans counters over the window, top posts and newest posts.\n * @throws {RemoteError} `media/not-found` for an unknown id.\n */"
				},
				{
					"kind": "method",
					"name": "postDetail",
					"signature": "@Remote postDetail(id: MediaAccountId, postId: string): MediaPostDetail",
					"summary": "Detail of one post: the platform's counters, rates and how they compare with the account's other posts.",
					"jsDoc": "/**\n * Detail of one post: the platform's counters, rates and how they compare with the account's other posts.\n * @param id - account id.\n * @param postId - platform post id.\n * @returns the detail.\n * @throws {RemoteError} `media/not-found` for an unknown account or post.\n */"
				},
				{
					"kind": "method",
					"name": "refresh",
					"signature": "@Remote async refresh(id: MediaAccountId, signal: AbortSignal): Promise<MediaRunRecord>",
					"summary": "Scrape one account now through the platform's headless browser.",
					"jsDoc": "/**\n * Scrape one account now through the platform's headless browser. The run is recorded even when it fails.\n * @param id - account id.\n * @param signal - cancellation.\n * @returns the recorded run; failures carry `ok: false` and an error code.\n * @throws {RemoteError} `media/not-found`, or `media/busy` while the account is already being scraped or imported.\n */"
				},
				{
					"kind": "method",
					"name": "importFile",
					"signature": "@Remote async importFile(id: MediaAccountId, fileName: string, base64: string): Promise<MediaImportResult>",
					"summary": "Import a creator-backend export file (xlsx, xls, csv in UTF-8 or GBK).",
					"jsDoc": "/**\n * Import a creator-backend export file (xlsx, xls, csv in UTF-8 or GBK).\n * @param id - account id.\n * @param fileName - original file name; the extension selects CSV decoding.\n * @param base64 - file content.\n * @returns what was written and which headers were not recognized.\n * @throws {RemoteError} `media/not-found`, `media/busy`, `media/invalid` for a non-base64 body, or `media/import-failed`.\n */"
				},
				{
					"kind": "method",
					"name": "generateTopics",
					"signature": "@Remote async generateTopics(id: MediaAccountId, signal: AbortSignal): Promise<MediaTopicReport>",
					"summary": "Generate and store a topic report.",
					"jsDoc": "/**\n * Generate and store a topic report. Research comes first: stale benchmark accounts are scraped again, and the\n * platform's trending list, platform searches for the account's own keywords and web news are read. The model sees\n * all of it with the account's posts and the titles recent reports already suggested, and returns search keywords\n * per topic; each topic's keywords are then searched on the platform and the best results are attached. A research\n * source that fails is skipped with a note.\n * @param id - account id.\n * @param signal - cancellation.\n * @returns the stored report.\n * @throws {RemoteError} `media/not-found`, `media/busy`, or `media/llm-failed`.\n */"
				},
				{
					"kind": "method",
					"name": "generateTopicsAbout",
					"signature": "@Remote async generateTopicsAbout(id: MediaAccountId, direction: string, signal: AbortSignal): Promise<MediaTopicReport>",
					"summary": "Generate and store a topic report about a direction the user names, such as a theme, a product or an event.",
					"jsDoc": "/**\n * Generate and store a topic report about a direction the user names, such as a theme, a product or an event.\n * Everything else is as in {@link MediaSuite.generateTopics}.\n * @param id - account id.\n * @param direction - what the topics should be about, in the user's words; blank means no direction.\n * @param signal - cancellation.\n * @returns the stored report, which records the direction.\n * @throws {RemoteError} `media/not-found`, `media/busy`, `media/llm-failed`, or `media/invalid` for a direction\n * longer than 500 characters.\n */"
				},
				{
					"kind": "method",
					"name": "findRelated",
					"signature": "@Remote async findRelated(id: MediaReportId, signal: AbortSignal): Promise<MediaTopicReport>",
					"summary": "Search the platform for each suggestion of a stored topic report again and store the most liked results, for a report generated before related posts existed or whose related posts are stale.",
					"jsDoc": "/**\n * Search the platform for each suggestion of a stored topic report again and store the most liked results, for a\n * report generated before related posts existed or whose related posts are stale. Suggestions without keywords are\n * searched by title. A search that fails keeps the suggestion's previous related posts and adds a note.\n * @param id - report id.\n * @param signal - cancellation.\n * @returns the updated report.\n * @throws {RemoteError} `media/not-found` for an unknown report or a deleted account, `media/invalid` when the\n * platform offers no search, or `media/busy` while the account has AI work in progress.\n */"
				},
				{
					"kind": "method",
					"name": "studioOpen",
					"signature": "@Remote async studioOpen(signal: AbortSignal): Promise<string | undefined>",
					"summary": "Start the creation workbench unless it runs, and return its page URL.",
					"jsDoc": "/**\n * Start the creation workbench unless it runs, and return its page URL.\n * @param signal - cancellation.\n * @returns the URL, or undefined when no workbench folder is configured.\n * @throws {RemoteError} `media/studio-failed` when the workbench does not start.\n */"
				},
				{
					"kind": "method",
					"name": "studioWriteArticle",
					"signature": "@Remote async studioWriteArticle(id: MediaReportId, index: number, signal: AbortSignal): Promise<string>",
					"summary": "Create a project in the creation workbench from one suggestion of a stored topic report: a video script for a video topic, whose skeleton is filled from the topic's filming plan, and an article otherwise.",
					"jsDoc": "/**\n * Create a project in the creation workbench from one suggestion of a stored topic report: a video script for a\n * video topic, whose skeleton is filled from the topic's filming plan, and an article otherwise. The topic's angle,\n * reasoning, headlines, keywords, references and related posts become the project's research notes.\n * @param id - report id.\n * @param index - suggestion index in the report.\n * @param signal - cancellation.\n * @returns the workbench URL that opens the new article's research step or the new script's writing step.\n * @throws {RemoteError} `media/not-found` for an unknown report, `media/invalid` for an index outside the report or\n * when no workbench folder is configured, or `media/studio-failed` when the workbench does not start or refuses.\n */"
				},
				{
					"kind": "method",
					"name": "topicReports",
					"signature": "@Remote topicReports(id: MediaAccountId): MediaTopicReport[]",
					"summary": "List stored topic reports.",
					"jsDoc": "/**\n * List stored topic reports.\n * @param id - account id.\n * @returns reports, newest first.\n * @throws {RemoteError} `media/not-found` for an unknown id.\n */"
				},
				{
					"kind": "method",
					"name": "analyze",
					"signature": "@Remote async analyze(id: MediaAccountId, signal: AbortSignal): Promise<MediaAnalysisReport>",
					"summary": "Generate and store a diagnosis of what an own account should improve over the analysis window.",
					"jsDoc": "/**\n * Generate and store a diagnosis of what an own account should improve over the analysis window.\n * @param id - own account id.\n * @param signal - cancellation.\n * @returns the stored report.\n * @throws {RemoteError} `media/not-found`, `media/invalid` for a benchmark account, `media/busy`, or `media/llm-failed`.\n */"
				},
				{
					"kind": "method",
					"name": "analysisReports",
					"signature": "@Remote analysisReports(id: MediaAccountId): MediaAnalysisReport[]",
					"summary": "List stored diagnosis reports.",
					"jsDoc": "/**\n * List stored diagnosis reports.\n * @param id - account id.\n * @returns reports, newest first.\n * @throws {RemoteError} `media/not-found` for an unknown id.\n */"
				},
				{
					"kind": "method",
					"name": "loginState",
					"signature": "@Remote loginState(platform: MediaPlatformId, account?: MediaAccountId): MediaLoginState",
					"summary": "Last detected login state of a browser profile.",
					"jsDoc": "/**\n * Last detected login state of a browser profile.\n * @param platform - platform id.\n * @param account - account whose profile is asked about; without it, the platform's shared profile.\n * @returns the state, or `unknown` when never detected.\n * @throws {RemoteError} `media/not-found` for an unregistered platform or unknown account.\n */"
				},
				{
					"kind": "method",
					"name": "browserOpen",
					"signature": "@Remote async browserOpen(platform: MediaPlatformId, url?: string, account?: MediaAccountId, fresh?: boolean): Promise<MediaBrowserView>",
					"summary": "Open an embedded headless browser view in a persistent profile.",
					"jsDoc": "/**\n * Open an embedded headless browser view in a persistent profile.\n * @param platform - platform id.\n * @param url - first URL; defaults to the platform's login page.\n * @param account - account whose profile the view opens in; without it, the platform's shared profile.\n * @param fresh - open a new, empty account profile instead, to scan in another account of the platform while the\n * accounts already connected stay logged in. Saving the account with this view keeps the profile; otherwise it is\n * deleted on a later start.\n * @returns the view id and viewport size.\n * @throws {RemoteError} `media/not-found`, `media/invalid` for a non-http URL or an account of another platform, or\n * `media/browser-unavailable`.\n */"
				},
				{
					"kind": "method",
					"name": "browserFrames",
					"signature": "@Remote({ mode: 'stream' }) async *browserFrames(id: MediaBrowserId, signal: AbortSignal): AsyncIterable<MediaBrowserFrame>",
					"summary": "Follow an embedded view: the latest frame and login state, then JPEG frames and login changes, ending with `closed`.",
					"jsDoc": "/**\n * Follow an embedded view: the latest frame and login state, then JPEG frames and login changes, ending with `closed`.\n * @param id - view id.\n * @param signal - ends the subscription; an unfollowed view closes after the detach period.\n * @returns the frame stream.\n * @throws {RemoteError} `media/not-found` when the view is not open.\n */"
				},
				{
					"kind": "method",
					"name": "browserInput",
					"signature": "@Remote async browserInput(id: MediaBrowserId, input: MediaBrowserInput): Promise<void>",
					"summary": "Forward panel input to an embedded view.",
					"jsDoc": "/**\n * Forward panel input to an embedded view.\n * @param id - view id.\n * @param input - pointer, key, text or navigation input in viewport pixels.\n * @returns after the input is dispatched.\n * @throws {RemoteError} `media/not-found` for a closed view or `media/invalid` for out-of-range input.\n */"
				},
				{
					"kind": "method",
					"name": "identify",
					"signature": "@Remote async identify(id: MediaBrowserId, signal: AbortSignal): Promise<MediaAccountIdentity>",
					"summary": "Identify the account logged in to an embedded view's profile, for adding it as an own account.",
					"jsDoc": "/**\n * Identify the account logged in to an embedded view's profile, for adding it as an own account. The view itself\n * is not navigated.\n * @param id - open view.\n * @param signal - cancellation.\n * @returns nickname, canonical profile URL and the matching stored own account, if any.\n * @throws {RemoteError} `media/not-found` for an unknown view, `media/login-required` when the view is not logged in,\n * `media/invalid` when the account cannot be identified, or `media/browser-unavailable`.\n */"
				},
				{
					"kind": "method",
					"name": "browserClose",
					"signature": "@Remote async browserClose(id: MediaBrowserId): Promise<void>",
					"summary": "Close an embedded view.",
					"jsDoc": "/**\n * Close an embedded view.\n * @param id - view id; closing a closed view does nothing.\n * @returns after the page closed.\n */"
				},
				{
					"kind": "method",
					"name": "monitorTick",
					"signature": "async monitorTick(): Promise<void>",
					"summary": "Run every account whose automatic scrape is due, one at a time; a tick is skipped while the previous one runs.",
					"jsDoc": "/**\n * Run every account whose automatic scrape is due, one at a time; a tick is skipped while the previous one runs.\n * @returns after the due accounts ran.\n */"
				},
				{
					"kind": "method",
					"name": "intervalOf",
					"signature": "intervalOf(account: MediaAccount): number",
					"summary": "Effective monitoring interval of an account.",
					"jsDoc": "/**\n * Effective monitoring interval of an account.\n * @param account - account.\n * @returns minutes between automatic scrapes.\n */"
				}
			],
			"types": [
				{
					"name": "Branded",
					"declaration": "export type Branded<B extends string> = string & { readonly [BRAND]: B; };"
				},
				{
					"name": "MediaAccount",
					"declaration": "export interface MediaAccount extends MediaAccountDraft {\n    readonly id: MediaAccountId;\n    readonly demo?: true | undefined;\n    readonly loginProfile?: string | undefined;\n    readonly createdAt: string;\n    readonly updatedAt: string;\n}"
				},
				{
					"name": "MediaAccountDraft",
					"declaration": "export interface MediaAccountDraft {\n    readonly id?: MediaAccountId | undefined;\n    readonly platform: MediaPlatformId;\n    readonly role: MediaAccountRole;\n    readonly name: string;\n    readonly profileUrl: string;\n    readonly niche: string;\n    readonly notes: string;\n    readonly monitor: MediaMonitorSettings;\n    readonly avatarUrl?: string | undefined;\n}"
				},
				{
					"name": "MediaAccountHealth",
					"declaration": "export interface MediaAccountHealth {\n    readonly state: MediaHealthState;\n    readonly updatedAt?: string | undefined;\n    readonly errorCode?: string | undefined;\n    readonly message?: string | undefined;\n    readonly nextRunAt?: string | undefined;\n    readonly monitored: boolean;\n}"
				},
				{
					"name": "MediaAccountId",
					"declaration": "export type MediaAccountId = Branded<'MediaAccountId'>;"
				},
				{
					"name": "MediaAccountIdentity",
					"declaration": "export interface MediaAccountIdentity {\n    readonly platform: MediaPlatformId;\n    readonly name: string;\n    readonly profileUrl: string;\n    readonly avatarUrl?: string | undefined;\n    readonly existingAccountId?: MediaAccountId | undefined;\n}"
				},
				{
					"name": "MediaAccountOverview",
					"declaration": "export interface MediaAccountOverview {\n    readonly account: MediaAccount;\n    readonly latest?: MediaMetricSnapshot | undefined;\n    readonly series: readonly MediaSeriesPoint[];\n    readonly deltas: { readonly followers?: number | undefined; readonly likes?: number | undefined; readonly posts?: number | undefined; };\n    readonly engagement: { readonly postCount: number; readonly avgLikes?: number | undefined; readonly avgComments?: number | undefined; readonly avgCollects?: number | undefined; readonly avgViews?: number | undefined; };\n    readonly lastRun?: MediaRunRecord | undefined;\n    readonly login: MediaLoginState;\n    readonly nextRunAt?: string | undefined;\n}"
				},
				{
					"name": "MediaAccountRole",
					"declaration": "export type MediaAccountRole = 'own' | 'benchmark';"
				},
				{
					"name": "MediaAccountSummary",
					"declaration": "export interface MediaAccountSummary {\n    readonly account: MediaAccount;\n    readonly platform: MediaPlatformDescriptor;\n    readonly health: MediaAccountHealth;\n    readonly headline: readonly MediaKpi[];\n    readonly followers?: number | undefined;\n    readonly latestPost?: MediaPost | undefined;\n}"
				},
				{
					"name": "MediaAnalysisReport",
					"declaration": "export interface MediaAnalysisReport {\n    readonly id: MediaReportId;\n    readonly accountId: MediaAccountId;\n    readonly createdAt: string;\n    readonly model: string;\n    readonly summary: string;\n    readonly strengths: readonly string[];\n    readonly items: readonly MediaImprovementItem[];\n}"
				},
				{
					"name": "MediaBrief",
					"declaration": "export interface MediaBrief {\n    readonly id: MediaReportId;\n    readonly day: string;\n    readonly createdAt: string;\n    readonly model: string;\n    readonly dataAt?: string | undefined;\n    readonly items: readonly MediaBriefItem[];\n}"
				},
				{
					"name": "MediaBriefItem",
					"declaration": "export interface MediaBriefItem {\n    readonly kind: MediaBriefKind;\n    readonly text: string;\n    readonly accountId?: MediaAccountId | undefined;\n    readonly platform?: string | undefined;\n    readonly detail?: string | undefined;\n    readonly post?: { readonly accountId: MediaAccountId; readonly postId: string; } | undefined;\n    readonly metric?: MediaNetworkKey | undefined;\n}"
				},
				{
					"name": "MediaBriefKind",
					"declaration": "export type MediaBriefKind = 'alert' | 'fact' | 'action' | 'topic';"
				},
				{
					"name": "MediaBriefState",
					"declaration": "export interface MediaBriefState {\n    readonly brief?: MediaBrief | undefined;\n    readonly running: boolean;\n    readonly partial: readonly MediaBriefItem[];\n    readonly problem?: string | undefined;\n    readonly scheduleAt: string;\n}"
				},
				{
					"name": "MediaBrowserFrame",
					"declaration": "export type MediaBrowserFrame = { readonly kind: 'frame'; readonly data: string; readonly width: number; readonly height: number; readonly url: string; readonly title: string; readonly loading?: boolean | undefined; } | { readonly kind: 'login'; readonly state: MediaLoginState; } | { readonly kind: 'qr'; readonly data?: string | undefined; readonly width: number; readonly height: number; } | { readonly kind: 'identity'; readonly identity: MediaAccountIdentity; } | { readonly kind: 'closed'; readonly reason: string; };"
				},
				{
					"name": "MediaBrowserId",
					"declaration": "export type MediaBrowserId = Branded<'MediaBrowserId'>;"
				},
				{
					"name": "MediaBrowserInput",
					"declaration": "export type MediaBrowserInput = { readonly kind: 'click'; readonly x: number; readonly y: number; readonly button: 'left' | 'right'; } | { readonly kind: 'down'; readonly x: number; readonly y: number; readonly button: 'left' | 'right'; } | { readonly kind: 'up'; readonly x: number; readonly y: number; readonly button: 'left' | 'right'; } | { readonly kind: 'move'; readonly x: number; readonly y: number; } | { readonly kind: 'wheel'; readonly x: number; readonly y: number; readonly deltaX: number; readonly deltaY: number; } | { readonly kind: 'key'; readonly key: string; } | { readonly kind: 'text'; readonly text: string; } | { readonly kind: 'navigate'; readonly url: string; } | { readonly kind: 'back'; } | { readonly kind: 'reload'; };"
				},
				{
					"name": "MediaBrowserView",
					"declaration": "export interface MediaBrowserView {\n    readonly id: MediaBrowserId;\n    readonly platform: MediaPlatformId;\n    readonly width: number;\n    readonly height: number;\n}"
				},
				{
					"name": "MediaDashboard",
					"declaration": "export interface MediaDashboard {\n    readonly account: MediaAccount;\n    readonly platform: MediaPlatformDescriptor;\n    readonly health: MediaAccountHealth;\n    readonly days: number;\n    readonly from: string;\n    readonly to: string;\n    readonly headline: readonly MediaKpi[];\n    readonly works: readonly MediaKpi[];\n    readonly fans: readonly MediaKpi[];\n    readonly top: readonly MediaRankedPost[];\n    readonly posts: readonly MediaPost[];\n}"
				},
				{
					"name": "MediaDataSource",
					"declaration": "export type MediaDataSource = 'scrape' | 'import';"
				},
				{
					"name": "MediaDayValue",
					"declaration": "export interface MediaDayValue {\n    readonly day: string;\n    readonly value: number;\n}"
				},
				{
					"name": "MediaDraft",
					"declaration": "export interface MediaDraft extends MediaDraftInput {\n    readonly id: MediaDraftId;\n    readonly createdAt: string;\n    readonly publishedUrl?: string | undefined;\n    readonly publishedAt?: string | undefined;\n    readonly demo?: true | undefined;\n}"
				},
				{
					"name": "MediaDraftId",
					"declaration": "export type MediaDraftId = Branded<'MediaDraftId'>;"
				},
				{
					"name": "MediaDraftInput",
					"declaration": "export interface MediaDraftInput {\n    readonly source: string;\n    readonly kind: MediaDraftKind;\n    readonly title: string;\n    readonly file?: string | undefined;\n    readonly folder?: string | undefined;\n    readonly note?: string | undefined;\n    readonly studioProject?: string | undefined;\n}"
				},
				{
					"name": "MediaDraftKind",
					"declaration": "export type MediaDraftKind = 'video' | 'article' | 'card';"
				},
				{
					"name": "MediaHealthState",
					"declaration": "export type MediaHealthState = 'login-required' | 'failing' | 'stale' | 'pending' | 'ok';"
				},
				{
					"name": "MediaHistoryDay",
					"declaration": "export interface MediaHistoryDay {\n    readonly day: string;\n    readonly followers?: number | undefined;\n    readonly followersNet?: number | undefined;\n    readonly extra: Readonly<Record<string, number>>;\n}"
				},
				{
					"name": "MediaHistoryLimits",
					"declaration": "export interface MediaHistoryLimits {\n    readonly days: number;\n    readonly signal: AbortSignal;\n}"
				},
				{
					"name": "MediaIdentityFields",
					"declaration": "export interface MediaIdentityFields {\n    readonly name: string;\n    readonly profileUrl: string;\n    readonly avatarUrl?: string | undefined;\n}"
				},
				{
					"name": "MediaImportColumn",
					"declaration": "export interface MediaImportColumn {\n    readonly field: MediaImportField;\n    readonly synonyms: readonly string[];\n}"
				},
				{
					"name": "MediaImportField",
					"declaration": "export type MediaImportField = 'title' | 'publishedAt' | 'url' | 'postId' | 'format' | 'views' | 'likes' | 'comments' | 'collects' | 'shares' | 'followers' | 'following' | 'totalLikes' | 'date' | `extra:${string}`;"
				},
				{
					"name": "MediaImportProfile",
					"declaration": "export interface MediaImportProfile {\n    readonly columns: readonly MediaImportColumn[];\n    readonly defaultFormat: MediaPostFormat;\n}"
				},
				{
					"name": "MediaImportResult",
					"declaration": "export interface MediaImportResult {\n    readonly snapshotWritten: boolean;\n    readonly postsWritten: number;\n    readonly unmappedColumns: readonly string[];\n}"
				},
				{
					"name": "MediaImprovementItem",
					"declaration": "export interface MediaImprovementItem {\n    readonly area: string;\n    readonly finding: string;\n    readonly evidence: string;\n    readonly action: string;\n    readonly priority: 'high' | 'medium' | 'low';\n}"
				},
				{
					"name": "MediaKeywordSearch",
					"declaration": "export interface MediaKeywordSearch {\n    readonly keyword: string;\n    readonly posts: readonly MediaRelatedPost[];\n}"
				},
				{
					"name": "MediaKpi",
					"declaration": "export interface MediaKpi {\n    readonly key: string;\n    readonly label: string;\n    readonly unit: MediaKpiUnit;\n    readonly value?: number | undefined;\n    readonly change?: number | undefined;\n    readonly previous?: number | undefined;\n    readonly daily: readonly MediaDayValue[];\n    readonly hint: string;\n}"
				},
				{
					"name": "MediaKpiUnit",
					"declaration": "export type MediaKpiUnit = 'count' | 'percent' | 'seconds';"
				},
				{
					"name": "MediaLlm",
					"declaration": "export type MediaLlm = (request: { readonly system: string; readonly input: string; }, signal: AbortSignal, onText?: (text: string) => void) => Promise<MediaLlmCompletion>;"
				},
				{
					"name": "MediaLlmCompletion",
					"declaration": "export interface MediaLlmCompletion {\n    readonly text: string;\n    readonly model: string;\n}"
				},
				{
					"name": "MediaLoginState",
					"declaration": "export type MediaLoginState = 'logged-in' | 'logged-out' | 'unknown';"
				},
				{
					"name": "MediaMetricLabels",
					"declaration": "export interface MediaMetricLabels {\n    readonly views?: string | undefined;\n    readonly likes?: string | undefined;\n    readonly comments?: string | undefined;\n    readonly shares?: string | undefined;\n    readonly collects?: string | undefined;\n}"
				},
				{
					"name": "MediaMetricSnapshot",
					"declaration": "export interface MediaMetricSnapshot {\n    readonly accountId: MediaAccountId;\n    readonly capturedAt: string;\n    readonly source: MediaDataSource;\n    readonly followers?: number | undefined;\n    readonly following?: number | undefined;\n    readonly likes?: number | undefined;\n    readonly posts?: number | undefined;\n    readonly extra: Readonly<Record<string, number>>;\n}"
				},
				{
					"name": "MediaMonitorSettings",
					"declaration": "export interface MediaMonitorSettings {\n    readonly enabled: boolean;\n    readonly intervalMinutes: number;\n}"
				},
				{
					"name": "MediaNetwork",
					"declaration": "export interface MediaNetwork {\n    readonly days: number;\n    readonly accounts: readonly MediaNetworkAccount[];\n    readonly totals: readonly MediaNetworkTotal[];\n    readonly synced: readonly MediaSyncedWork[];\n    readonly posts: readonly MediaPost[];\n}"
				},
				{
					"name": "MediaNetworkAccount",
					"declaration": "export interface MediaNetworkAccount {\n    readonly account: MediaAccount;\n    readonly platform: MediaPlatformDescriptor;\n    readonly health: MediaAccountHealth;\n    readonly followers?: number | undefined;\n    readonly kpis: readonly MediaKpi[];\n    readonly from: string;\n    readonly to: string;\n}"
				},
				{
					"name": "MediaNetworkKey",
					"declaration": "export type MediaNetworkKey = 'followers' | 'fansNet' | 'views' | 'likes' | 'comments' | 'shares' | 'posts';"
				},
				{
					"name": "MediaNetworkPart",
					"declaration": "export interface MediaNetworkPart {\n    readonly accountId: MediaAccountId;\n    readonly value: number;\n}"
				},
				{
					"name": "MediaNetworkTotal",
					"declaration": "export interface MediaNetworkTotal {\n    readonly key: MediaNetworkKey;\n    readonly label: string;\n    readonly unit: MediaKpiUnit;\n    readonly value?: number | undefined;\n    readonly previous?: number | undefined;\n    readonly change?: number | undefined;\n    readonly parts: readonly MediaNetworkPart[];\n    readonly daily: readonly { readonly day: string; readonly total: number; readonly parts: Readonly<Record<string, number>>; }[];\n    readonly trend: readonly { readonly day: string; readonly total: number; readonly parts: Readonly<Record<string, number>>; }[];\n}"
				},
				{
					"name": "MediaNewsItem",
					"declaration": "export interface MediaNewsItem {\n    readonly title: string;\n    readonly url: string;\n    readonly snippet: string;\n    readonly publishedAt?: string | undefined;\n}"
				},
				{
					"name": "MediaPlatformAdapter",
					"declaration": "export interface MediaPlatformAdapter {\n    readonly descriptor: MediaPlatformDescriptor;\n    readonly importProfile: MediaImportProfile;\n    readonly scrapableRoles?: readonly MediaAccountRole[];\n    readonly detectLogin: (page: Page) => Promise<MediaLoginState>;\n    readonly scrape?: (page: Page, account: MediaAccount, limits: MediaScrapeLimits) => Promise<MediaScrapeResult>;\n    readonly identify?: (page: Page, signal: AbortSignal) => Promise<MediaIdentityFields | undefined>;\n    readonly identityMatch?: 'profile-url' | 'platform';\n    readonly history?: (page: Page, account: MediaAccount, limits: MediaHistoryLimits) => Promise<readonly MediaHistoryDay[]>;\n    readonly search?: (page: Page, keyword: string, limits: MediaSearchLimits) => Promise<readonly MediaRelatedPost[]>;\n    readonly trending?: (page: Page, signal: AbortSignal) => Promise<readonly MediaTrendingTopic[]>;\n    readonly qrSelectors?: readonly string[];\n    readonly qrExpired?: string;\n}"
				},
				{
					"name": "MediaPlatformDescriptor",
					"declaration": "export interface MediaPlatformDescriptor {\n    readonly search?: boolean;\n    readonly id: MediaPlatformId;\n    readonly displayName: string;\n    readonly loginUrl: string;\n    readonly scrape: boolean;\n    readonly import: boolean;\n    readonly importHint: string;\n    readonly profileUrlExample: string;\n    readonly metrics?: MediaMetricLabels | undefined;\n    readonly noun?: string | undefined;\n    readonly color?: string | undefined;\n    readonly beta?: boolean | undefined;\n}"
				},
				{
					"name": "MediaPlatformId",
					"declaration": "export type MediaPlatformId = string;"
				},
				{
					"name": "MediaPost",
					"declaration": "export interface MediaPost {\n    readonly accountId: MediaAccountId;\n    readonly postId: string;\n    readonly title: string;\n    readonly url?: string | undefined;\n    readonly publishedAt?: string | undefined;\n    readonly format: MediaPostFormat;\n    readonly views?: number | undefined;\n    readonly likes?: number | undefined;\n    readonly comments?: number | undefined;\n    readonly collects?: number | undefined;\n    readonly shares?: number | undefined;\n    readonly coverUrl?: string | undefined;\n    readonly extra: Readonly<Record<string, number>>;\n    readonly source: MediaDataSource;\n    readonly updatedAt: string;\n}"
				},
				{
					"name": "MediaPostDetail",
					"declaration": "export interface MediaPostDetail {\n    readonly account: MediaAccount;\n    readonly platform: MediaPlatformDescriptor;\n    readonly post: MediaPost;\n    readonly metrics: readonly MediaPostMetric[];\n    readonly rates: readonly MediaPostRate[];\n    readonly baselinePosts: number;\n    readonly rank?: { readonly by: string; readonly position: number; readonly of: number; } | undefined;\n}"
				},
				{
					"name": "MediaPostFields",
					"declaration": "export type MediaPostFields = Omit<MediaPost, 'accountId' | 'source' | 'updatedAt'>;"
				},
				{
					"name": "MediaPostFormat",
					"declaration": "export type MediaPostFormat = 'image' | 'video' | 'article' | 'other';"
				},
				{
					"name": "MediaPostMetric",
					"declaration": "export interface MediaPostMetric {\n    readonly key: 'views' | 'likes' | 'comments' | 'shares' | 'collects';\n    readonly label: string;\n    readonly value?: number | undefined;\n    readonly median?: number | undefined;\n}"
				},
				{
					"name": "MediaPostRate",
					"declaration": "export interface MediaPostRate {\n    readonly key: string;\n    readonly label: string;\n    readonly value: number;\n    readonly median?: number | undefined;\n}"
				},
				{
					"name": "MediaRankedPost",
					"declaration": "export interface MediaRankedPost {\n    readonly post: MediaPost;\n    readonly label: string;\n    readonly value: number;\n}"
				},
				{
					"name": "MediaRelatedPost",
					"declaration": "export interface MediaRelatedPost {\n    readonly postId: string;\n    readonly title: string;\n    readonly url: string;\n    readonly author: string;\n    readonly coverUrl?: string | undefined;\n    readonly publishedAt?: string | undefined;\n    readonly format: MediaPostFormat;\n    readonly views?: number | undefined;\n    readonly likes?: number | undefined;\n    readonly comments?: number | undefined;\n    readonly collects?: number | undefined;\n    readonly shares?: number | undefined;\n}"
				},
				{
					"name": "MediaReportId",
					"declaration": "export type MediaReportId = Branded<'MediaReportId'>;"
				},
				{
					"name": "MediaRunRecord",
					"declaration": "export interface MediaRunRecord {\n    readonly accountId: MediaAccountId;\n    readonly kind: 'scrape' | 'import';\n    readonly startedAt: string;\n    readonly finishedAt: string;\n    readonly ok: boolean;\n    readonly errorCode?: string | undefined;\n    readonly message?: string | undefined;\n    readonly postsWritten: number;\n}"
				},
				{
					"name": "MediaScrapeLimits",
					"declaration": "export interface MediaScrapeLimits {\n    readonly maxPosts: number;\n    readonly signal: AbortSignal;\n}"
				},
				{
					"name": "MediaScrapeResult",
					"declaration": "export interface MediaScrapeResult {\n    readonly snapshot: MediaSnapshotFields;\n    readonly posts: readonly MediaPostFields[];\n    readonly avatarUrl?: string | undefined;\n}"
				},
				{
					"name": "MediaSearchLimits",
					"declaration": "export interface MediaSearchLimits {\n    readonly maxPosts: number;\n    readonly signal: AbortSignal;\n}"
				},
				{
					"name": "MediaSeriesPoint",
					"declaration": "export interface MediaSeriesPoint {\n    readonly at: string;\n    readonly followers?: number | undefined;\n    readonly likes?: number | undefined;\n    readonly posts?: number | undefined;\n    readonly plays?: number | undefined;\n    readonly profileViews?: number | undefined;\n    readonly fansNet?: number | undefined;\n    readonly postLikes?: number | undefined;\n}"
				},
				{
					"name": "MediaSnapshotFields",
					"declaration": "export type MediaSnapshotFields = Omit<MediaMetricSnapshot, 'accountId' | 'capturedAt' | 'source'>;"
				},
				{
					"name": "MediaSummary",
					"declaration": "export interface MediaSummary {\n    readonly accounts: readonly MediaAccountSummary[];\n    readonly latestPosts: readonly MediaPost[];\n}"
				},
				{
					"name": "MediaSyncedWork",
					"declaration": "export interface MediaSyncedWork {\n    readonly title: string;\n    readonly posts: readonly MediaPost[];\n    readonly views?: number | undefined;\n    readonly likes?: number | undefined;\n    readonly comments?: number | undefined;\n    readonly shares?: number | undefined;\n}"
				},
				{
					"name": "MediaTodaySection",
					"declaration": "export type MediaTodaySection = 'todo' | 'numbers' | 'ready' | 'drafts' | 'own' | 'peers';"
				},
				{
					"name": "MediaTopicReport",
					"declaration": "export interface MediaTopicReport {\n    readonly id: MediaReportId;\n    readonly accountId: MediaAccountId;\n    readonly createdAt: string;\n    readonly model: string;\n    readonly summary: string;\n    readonly suggestions: readonly MediaTopicSuggestion[];\n    readonly research?: MediaTopicResearch | undefined;\n    readonly direction?: string | undefined;\n}"
				},
				{
					"name": "MediaTopicResearch",
					"declaration": "export interface MediaTopicResearch {\n    readonly searches: readonly MediaKeywordSearch[];\n    readonly trending: readonly MediaTrendingTopic[];\n    readonly news: readonly MediaNewsItem[];\n    readonly benchmarksRefreshed: number;\n    readonly notes: readonly string[];\n}"
				},
				{
					"name": "MediaTopicSuggestion",
					"declaration": "export interface MediaTopicSuggestion {\n    readonly title: string;\n    readonly angle: string;\n    readonly reason: string;\n    readonly format: MediaPostFormat;\n    readonly headlines: readonly string[];\n    readonly references: readonly string[];\n    readonly priority: 'high' | 'medium' | 'low';\n    readonly keywords: readonly string[];\n    readonly related: readonly MediaRelatedPost[];\n    readonly video?: MediaTopicVideo | undefined;\n}"
				},
				{
					"name": "MediaTopicVideo",
					"declaration": "export interface MediaTopicVideo {\n    readonly hook: string;\n    readonly outline: readonly string[];\n    readonly seconds: number;\n    readonly cover: string;\n}"
				},
				{
					"name": "MediaTrendingTopic",
					"declaration": "export interface MediaTrendingTopic {\n    readonly word: string;\n    readonly heat?: number | undefined;\n}"
				},
				{
					"name": "MediaUiSettings",
					"declaration": "export interface MediaUiSettings {\n    readonly title?: string | undefined;\n    readonly accent?: string | undefined;\n    readonly labels: Readonly<Partial<Record<MediaView, string>>>;\n    readonly hidden: readonly MediaView[];\n    readonly today?: readonly MediaTodaySection[] | undefined;\n    readonly css: string;\n    readonly problems: readonly string[];\n    readonly file?: string | undefined;\n    readonly writing?: boolean | undefined;\n}"
				},
				{
					"name": "MediaView",
					"declaration": "export type MediaView = 'today' | 'topics' | 'studio' | 'data' | 'accounts';"
				}
			]
		}],
		"events": [],
		"objects": []
	}
};
//#endregion
export { TYPERT };
