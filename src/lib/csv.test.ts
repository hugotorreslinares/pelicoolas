import { describe, expect, it } from "vitest";
import { extractImportRows, parseCsv } from "./csv";

describe("parseCsv", () => {
  it("splits plain rows", () => {
    expect(parseCsv("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("keeps a comma inside quotes as part of the field", () => {
    expect(parseCsv('Name,Year\n"Léon, the Professional",1994')).toEqual([
      ["Name", "Year"],
      ["Léon, the Professional", "1994"],
    ]);
  });

  it("unescapes doubled quotes", () => {
    expect(parseCsv('a\n"she said ""hi"""')).toEqual([
      ["a"],
      ['she said "hi"'],
    ]);
  });

  it("skips blank lines", () => {
    expect(parseCsv("a,b\n\n1,2\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("extractImportRows", () => {
  it("reads title/year from a Letterboxd-style header", () => {
    const table = parseCsv(
      "Date,Name,Year,Letterboxd URI\n2026-01-01,Alien,1979,https://x",
    );
    expect(extractImportRows(table)).toEqual([{ title: "Alien", year: 1979 }]);
  });

  it("reads title/year from an IMDb-style header", () => {
    const table = parseCsv(
      "Const,Your Rating,Title,Year\ntt123,8,The Matrix,1999",
    );
    expect(extractImportRows(table)).toEqual([
      { title: "The Matrix", year: 1999 },
    ]);
  });

  it("dedupes identical title+year rows", () => {
    const table = parseCsv("Title,Year\nDune,2021\nDune,2021");
    expect(extractImportRows(table)).toEqual([{ title: "Dune", year: 2021 }]);
  });

  it("returns an empty list when there's no recognizable title column", () => {
    const table = parseCsv("Foo,Bar\n1,2");
    expect(extractImportRows(table)).toEqual([]);
  });

  it("treats a malformed year as unknown rather than throwing", () => {
    const table = parseCsv("Title,Year\nDune,n/a");
    expect(extractImportRows(table)).toEqual([{ title: "Dune", year: null }]);
  });
});
