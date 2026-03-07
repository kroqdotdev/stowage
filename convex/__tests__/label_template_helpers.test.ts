import { describe, expect, it } from "vitest";
import { ConvexError } from "convex/values";
import {
  normalizeLabelTemplateName,
  normalizeLabelTemplateNameKey,
  normalizeLabelTemplateElements,
  normalizeLabelTemplateInput,
  createDefaultLabelTemplateDefinitions,
  type LabelTemplateElementInput,
} from "../label_template_helpers";

function expectConvexError(fn: () => unknown, code: string) {
  try {
    fn();
    expect.unreachable("Expected ConvexError");
  } catch (error) {
    expect(error).toBeInstanceOf(ConvexError);
    expect((error as ConvexError<{ code: string }>).data.code).toBe(code);
  }
}

function makeElement(
  overrides: Partial<LabelTemplateElementInput> = {},
): LabelTemplateElementInput {
  return {
    id: "el-1",
    type: "assetTag",
    xMm: 2,
    yMm: 2,
    widthMm: 10,
    heightMm: 5,
    ...overrides,
  };
}

describe("normalizeLabelTemplateName", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeLabelTemplateName("  My   Template  ")).toBe("My Template");
  });
});

describe("normalizeLabelTemplateNameKey", () => {
  it("lowercases the normalized name", () => {
    expect(normalizeLabelTemplateNameKey("My Template")).toBe("my template");
  });
});

describe("normalizeLabelTemplateElements", () => {
  const bounds = { widthMm: 50, heightMm: 30 };

  it("normalizes valid elements", () => {
    const elements = [makeElement()];
    const result = normalizeLabelTemplateElements({ elements, ...bounds });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("el-1");
    expect(result[0].type).toBe("assetTag");
  });

  it("rejects empty element id", () => {
    expectConvexError(
      () =>
        normalizeLabelTemplateElements({
          elements: [makeElement({ id: "  " })],
          ...bounds,
        }),
      "INVALID_TEMPLATE_ELEMENT",
    );
  });

  it("rejects duplicate element ids", () => {
    expectConvexError(
      () =>
        normalizeLabelTemplateElements({
          elements: [makeElement({ id: "dup" }), makeElement({ id: "dup" })],
          ...bounds,
        }),
      "INVALID_TEMPLATE_ELEMENT",
    );
  });

  it("rejects elements outside label bounds", () => {
    expectConvexError(
      () =>
        normalizeLabelTemplateElements({
          elements: [makeElement({ xMm: 55, yMm: 2 })],
          ...bounds,
        }),
      "INVALID_TEMPLATE_ELEMENT",
    );
  });

  it("rejects elements that overflow label bounds", () => {
    expectConvexError(
      () =>
        normalizeLabelTemplateElements({
          elements: [makeElement({ xMm: 45, widthMm: 10 })],
          ...bounds,
        }),
      "INVALID_TEMPLATE_ELEMENT",
    );
  });

  it("rejects static text without text content", () => {
    expectConvexError(
      () =>
        normalizeLabelTemplateElements({
          elements: [makeElement({ type: "staticText", text: "" })],
          ...bounds,
        }),
      "INVALID_TEMPLATE_ELEMENT",
    );
  });

  it("rejects custom field without fieldId", () => {
    expectConvexError(
      () =>
        normalizeLabelTemplateElements({
          elements: [makeElement({ type: "customField" })],
          ...bounds,
        }),
      "INVALID_TEMPLATE_ELEMENT",
    );
  });

  it("normalizes font size", () => {
    const result = normalizeLabelTemplateElements({
      elements: [makeElement({ fontSize: 12.345 })],
      ...bounds,
    });
    expect(result[0].fontSize).toBe(12.35);
  });

  it("rejects font size above 72", () => {
    expectConvexError(
      () =>
        normalizeLabelTemplateElements({
          elements: [makeElement({ fontSize: 73 })],
          ...bounds,
        }),
      "INVALID_TEMPLATE_ELEMENT",
    );
  });
});

describe("normalizeLabelTemplateInput", () => {
  it("normalizes a valid template", () => {
    const result = normalizeLabelTemplateInput({
      name: "  Test Template  ",
      widthMm: 50,
      heightMm: 30,
      elements: [makeElement()],
    });
    expect(result.name).toBe("Test Template");
    expect(result.normalizedName).toBe("test template");
    expect(result.widthMm).toBe(50);
    expect(result.heightMm).toBe(30);
    expect(result.elements).toHaveLength(1);
  });

  it("rejects empty name", () => {
    expectConvexError(
      () =>
        normalizeLabelTemplateInput({
          name: "   ",
          widthMm: 50,
          heightMm: 30,
          elements: [],
        }),
      "INVALID_TEMPLATE_NAME",
    );
  });

  it("rejects invalid dimensions", () => {
    expectConvexError(
      () =>
        normalizeLabelTemplateInput({
          name: "Test",
          widthMm: 0,
          heightMm: 30,
          elements: [],
        }),
      "INVALID_TEMPLATE",
    );

    expectConvexError(
      () =>
        normalizeLabelTemplateInput({
          name: "Test",
          widthMm: 50,
          heightMm: 201,
          elements: [],
        }),
      "INVALID_TEMPLATE",
    );
  });
});

describe("createDefaultLabelTemplateDefinitions", () => {
  it("returns two default templates", () => {
    const templates = createDefaultLabelTemplateDefinitions();
    expect(templates).toHaveLength(2);
  });

  it("includes exactly one default template", () => {
    const templates = createDefaultLabelTemplateDefinitions();
    const defaults = templates.filter((t) => t.isDefault);
    expect(defaults).toHaveLength(1);
  });

  it("has normalized elements on each template", () => {
    const templates = createDefaultLabelTemplateDefinitions();
    for (const template of templates) {
      expect(template.elements.length).toBeGreaterThan(0);
      for (const element of template.elements) {
        expect(element.id).toBeTruthy();
        expect(element.type).toBeTruthy();
      }
    }
  });
});
