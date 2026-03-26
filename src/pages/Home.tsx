import Header from "@/components/layout/Header";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* HEADER */}
      <Header mostrarEntrar={true} />

      <section
        id="quem-somos"
        style={{ backgroundColor: "#16a34a" }}
        className="overflow-hidden pt-16 md:pt-20"
      >
        <div className="w-full flex flex-col md:flex-row items-stretch min-h-screen">
          <div className="w-full md:w-1/2 flex items-center py-16 px-8 sm:px-12 lg:px-20 order-2 md:order-1">
            <div>
              <h1 className="font-display text-4xl sm:text-5xl font-bold text-white mb-6 leading-tight">
                Quem Somos?
              </h1>
              <p className="text-white text-base sm:text-lg leading-relaxed text-justify">
                Somos uma organização sindical formada por trabalhadores de
                cooperativas de saúde, criada com o propósito de representar,
                fortalecer e defender os direitos, deveres e interesses
                profissionais de todos que atuam nesse setor.
              </p>
              <p className="text-white text-base sm:text-lg leading-relaxed mt-4 text-justify">
                Trabalhamos de forma ativa na promoção de melhores condições de
                trabalho, valorização profissional e diálogo permanente com as
                cooperativas e demais instituições, buscando garantir respeito,
                transparência e justiça nas relações laborais.
              </p>
              <p className="text-white text-base sm:text-lg leading-relaxed mt-4 text-justify">
                Nosso compromisso é unir a categoria, oferecer apoio, orientação
                e representatividade, contribuindo para o desenvolvimento
                sustentável das cooperativas de saúde e para a dignidade de cada
                profissional.
              </p>
            </div>
          </div>

          <div className="relative w-full md:w-1/2 h-64 md:h-screen flex-shrink-0 order-1 md:order-2">
            <svg
              className="absolute top-0 left-0 h-full z-10 hidden md:block"
              style={{ width: "80px", transform: "translateX(-1px)" }}
              viewBox="0 0 80 100"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0,0 C40,0 80,20 80,50 C80,80 40,100 0,100 L0,0 Z"
                fill="#16a34a"
              />
            </svg>
            <img
              src="/images/Beto carrero.webp"
              alt="Quem Somos"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      <section
        id="finalidade"
        style={{ backgroundColor: "#16a34a" }}
        className="overflow-hidden border-t border-green-500"
      >
        <div className="w-full flex flex-col md:flex-row items-stretch">
          <div className="relative w-full md:w-1/2 h-64 md:h-auto min-h-64 flex-shrink-0">
            <img
              src="/images/ponte.png"
              alt="Finalidade"
              className="w-full h-full object-cover"
            />
            <svg
              className="absolute top-0 right-0 h-full z-10 hidden md:block"
              style={{ width: "80px", transform: "translateX(1px)" }}
              viewBox="0 0 80 100"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M80,0 C40,0 0,20 0,50 C0,80 40,100 80,100 L80,0 Z"
                fill="#16a34a"
              />
            </svg>
          </div>

          <div className="w-full md:w-1/2 flex items-center py-16 px-8 sm:px-12 lg:px-20">
            <div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-6">
                Finalidade
              </h2>
              <p className="text-white text-sm sm:text-base leading-relaxed mb-4 text-justify">
                O SECOOMED-PR é uma entidade comprometida com a valorização e a
                representatividade dos trabalhadores em cooperativas de saúde,
                atuando de forma ética, transparente e sem fins lucrativos.
              </p>
              <p className="text-white text-sm sm:text-base leading-relaxed mb-4 text-justify">
                Além de sua atuação na defesa dos direitos e interesses da
                categoria, o sindicato promove diversas atividades voltadas à
                integração, ao fortalecimento institucional e ao bem-estar de
                seus associados.
              </p>
              <p className="text-white text-sm sm:text-base leading-relaxed mb-4 text-justify">
                Entre as iniciativas realizadas estão assembleias, encontros,
                viagens, confraternizações e outros eventos que visam estimular
                a participação ativa dos membros, fortalecer os laços entre os
                associados e proporcionar momentos de lazer e desenvolvimento
                coletivo.
              </p>
              <p className="text-white text-sm sm:text-base leading-relaxed text-justify">
                Esta página tem como finalidade organizar, divulgar e gerenciar
                essas atividades, garantindo comunicação clara, acesso às
                informações e ampla participação dos associados nas ações
                promovidas pelo SECOOMED-PR.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-green-900 text-green-200 text-center py-6 text-sm mt-auto">
        Secoomed Tour. Todos os direitos reservados.
      </footer>
    </div>
  );
}
