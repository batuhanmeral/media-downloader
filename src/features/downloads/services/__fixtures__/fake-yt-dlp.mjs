// Testlerde yt-dlp yerine çalışan script; ilk argüman senaryoyu seçer
const scenario = process.argv[2];

switch (scenario) {
  case "json-ok":
    process.stdout.write(JSON.stringify({ id: "abc", title: "Test" }));
    break;
  case "json-invalid":
    process.stdout.write("not json");
    break;
  case "fail":
    process.stdout.write("[meta] abc|Test\n");
    process.stderr.write(
      "WARNING: something odd\nERROR: [youtube] abc: Video unavailable\n",
    );
    process.exitCode = 1;
    break;
  case "stream-ok":
    process.stdout.write(
      "[meta] abc|Test\n[dl] none|50|100|NA|10|5\n[file] /tmp/Test [abc].m4a",
    );
    break;
  case "stream-pp":
    process.stderr.write("[pp] started|ExtractAudio\n");
    break;
  case "hang":
    process.stdout.write("[meta] abc|Test\n");
    setInterval(() => {}, 1000);
    break;
  default:
    process.stderr.write(`ERROR: unknown scenario ${scenario}\n`);
    process.exitCode = 2;
}
