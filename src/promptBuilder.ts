export class PromptBuilder {
  build(template: string, variables: { diff: string; files: string; branch: string; lang: string }): string {
    return template
      .replace(/{diff}/g, variables.diff)
      .replace(/{files}/g, variables.files)
      .replace(/{branch}/g, variables.branch)
      .replace(/{lang}/g, variables.lang);
  }
}
