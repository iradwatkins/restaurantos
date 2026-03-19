import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { arrayToCsv, downloadCsv, downloadBlob } from './export';

describe('arrayToCsv', () => {
  it('produces basic CSV output', () => {
    const result = arrayToCsv(['Name', 'Age'], [['Alice', '30'], ['Bob', '25']]);
    expect(result).toBe('Name,Age\nAlice,30\nBob,25');
  });

  it('escapes values containing commas', () => {
    const result = arrayToCsv(['Item'], [['Eggs, bacon']]);
    expect(result).toBe('Item\n"Eggs, bacon"');
  });

  it('escapes values containing double quotes', () => {
    const result = arrayToCsv(['Quote'], [['She said "hello"']]);
    expect(result).toBe('Quote\n"She said ""hello"""');
  });

  it('escapes values containing newlines', () => {
    const result = arrayToCsv(['Note'], [['Line1\nLine2']]);
    expect(result).toBe('Note\n"Line1\nLine2"');
  });

  it('handles empty rows', () => {
    const result = arrayToCsv(['A', 'B'], []);
    expect(result).toBe('A,B');
  });

  it('handles empty headers and rows', () => {
    const result = arrayToCsv([], []);
    expect(result).toBe('');
  });
});

describe('downloadBlob', () => {
  let mockLink: {
    href: string;
    download: string;
    style: Record<string, string>;
    click: ReturnType<typeof vi.fn>;
  };
  let mockUrl: string;

  beforeEach(() => {
    mockLink = {
      href: '',
      download: '',
      style: {},
      click: vi.fn(),
    };
    mockUrl = 'blob:http://localhost/fake-url';

    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    vi.spyOn(document.body, 'appendChild').mockImplementation((el) => el);
    vi.spyOn(document.body, 'removeChild').mockImplementation((el) => el);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue(mockUrl);
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a link element with the blob URL', () => {
    const blob = new Blob(['test'], { type: 'text/plain' });
    downloadBlob('file.txt', blob);

    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(mockLink.href).toBe(mockUrl);
    expect(mockLink.download).toBe('file.txt');
  });

  it('clicks the link to trigger download', () => {
    const blob = new Blob(['test'], { type: 'text/plain' });
    downloadBlob('file.txt', blob);

    expect(mockLink.click).toHaveBeenCalled();
  });

  it('cleans up the link and revokes the URL', () => {
    const blob = new Blob(['test'], { type: 'text/plain' });
    downloadBlob('file.txt', blob);

    expect(document.body.appendChild).toHaveBeenCalled();
    expect(document.body.removeChild).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl);
  });

  it('sets display to none on the link', () => {
    const blob = new Blob(['test'], { type: 'text/plain' });
    downloadBlob('file.txt', blob);

    expect(mockLink.style.display).toBe('none');
  });
});

describe('downloadCsv', () => {
  beforeEach(() => {
    vi.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      style: {},
      click: vi.fn(),
    } as any);
    vi.spyOn(document.body, 'appendChild').mockImplementation((el) => el);
    vi.spyOn(document.body, 'removeChild').mockImplementation((el) => el);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a Blob with CSV content type', () => {
    downloadCsv('report.csv', 'A,B\n1,2');

    expect(URL.createObjectURL).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'text/csv;charset=utf-8;' })
    );
  });

  it('passes the filename through', () => {
    const mockLink = { href: '', download: '', style: {}, click: vi.fn() };
    (document.createElement as any).mockReturnValue(mockLink);

    downloadCsv('data.csv', 'test');
    expect(mockLink.download).toBe('data.csv');
  });
});
