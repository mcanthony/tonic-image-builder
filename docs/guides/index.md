---
layout: default
---

<div class="home">

    <section class="intro">
        <div class="grid">
            <div class="unit whole center-on-mobiles">
                <p class="vision">{{ site.vision }}</p>
                <p class="description"> {{ site.description }}</p>
                <p class="details hide-on-mobiles"> {{ site.details }}</p>
            </div>
        </div>
    </section>
    <section class="feature">
        <div class='grid'>
            <div class='unit one-third'>
                <h2>Data Processing</h2>
                <p>
                    Tonic Image Builder provide several data processor meant to
                    generate images to be rendered.
                </p>
            </div>
            <div class="unit one-third">
                <h2>LookupTable</h2>
                <p>
                    Tonic Image Builder provide an implementation of LookupTable
                    which let you convert any scalar into a corresponding color.
                    Our lookup tables come with some nice preset.
                </p>
            </div>
            <div class="unit one-third">
                <h2>Several ImageBuilders</h2>
                <p>
                    Tonic Image Builder rely on JavaScript and/or WebGL in
                    order to perform complex data processing the most efficiently.
                    (CompositeImageBuilder, DataProberImageBuilder, ...)
                </p>
            </div>
        </div>
    </section>
   <div class="grid">
        <div class="unit whole">

        <h2>Getting Started</h2>
        <p>{{ site.project }} can be retrieved using npm within your web project.</p>

        <h2>npm</h2>

{% highlight bash %}
$ npm install {{ site.project }} --save
{% endhighlight %}

        <h2>Quick-start</h2>
        For the impatient, here's how to get boilerplate {{ site.project }} up and running.

{% highlight bash %}
$ git clone git@github.com:{{site.repository}}.git
$ cd {{site.project}}
$ npm install
$ npm run test
{% endhighlight %}

        <h2>Documentation</h2>
        <p>See the <a href="{{ site.baseurl }}">documentation</a> for a getting started guide, advanced documentation,
        and API descriptions.</p>

        <h2>Licensing</h2>
        <p>{{ site.title }} is licensed under {{ site.license }}
        <a href="https://github.com/{{ site.repository }}/blob/master/LICENSE">License</a>.</p>

        <h2>Getting Involved</h2>
        <p>Fork the {{ site.project }} repository and do great things. At <a href="{{ site.companyURL }}">
        {{ site.company }}</a>, we want to make {{ site.project }} useful to as many people as possible.

        </div>
    </div>
</div>
